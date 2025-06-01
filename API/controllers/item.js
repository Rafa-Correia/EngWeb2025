var item = require('../models/item');
var document = require('../models/document')
var fs = require('fs')
var jszip = require('jszip')
var uuidv4 = require('uuid').v4
var xml2js = require('xml2js')
var crypto = require('crypto')
var path = require('path')

const CLASSIFICADORES_VALIDOS = [ 'texto', 'foto', 'viagem', 'trabalho', 'formacao', 'evento', 'desporto', 'saude' ]

module.exports.findAll = (userId, classificador) => {
  const filtro = { owner: userId };
  
  if (classificador) {
    filtro.classificadores = classificador;
  }

  return item.find(filtro).sort({creationDate: 1}).exec();
}


module.exports.findById = (id, userId) => {
  return item.findOne({ _id: id, owner: userId }).exec();
}


module.exports.create = async (itemData) => {
    const newitem = new item(itemData);
    return newitem.save();
}


module.exports.delete = (id, username) => {
    console.log('id: ' + id + '  |   username: ' + username)
    //item.find({ _id: id, owner: username}).then(doc => console.log(doc))
    return item.findOneAndDelete({_id : id, owner : username}).exec();
}


module.exports.findPublic = () => {
  return item.find({ isPublic: true }).exec();
};


module.exports.findPublicById = (id) => {
  return item.findOne({ _id: id, isPublic: true }).exec();
};


module.exports.setVisibility = (id, username, isPublic) => {
  return item.findOneAndUpdate(
    { _id: id, owner: username },
    { isPublic: isPublic },
    { new: true }
  ).exec();
};


module.exports.addComment = async (id, text) => {
  const itemDoc = await item.findOne({ _id: id}).exec();
  if (!itemDoc) return null;

  itemDoc.comments.push({ text: text });
  return itemDoc.save();
};

module.exports.ingest = async (zipPath, username) => {
  try {
    const zipBuffer = fs.readFileSync(zipPath);
    const zip = await jszip.loadAsync(zipBuffer);

    // Verificar se tem manifesto
    const manifestoFile = zip.file('manifesto-SIP.json') || zip.file('manifesto-SIP.xml');
    if (!manifestoFile) {
      return { error: 'Ficheiro manifesto-SIP.(json|xml) não encontrado.' }
    }

    // Ler o manifesto
    let postinfo;
    const manifestoContent = await manifestoFile.async('string');
    if (manifestoFile.name.endsWith('.json')) {
      postinfo = JSON.parse(manifestoContent);
    } else {
      const parsed = await xml2js.parseStringPromise(manifestoContent);
      postinfo = parsed;
    }

    const tipo = postinfo.tipo; // ex: "viagem"

    if (!CLASSIFICADORES_VALIDOS.includes(tipo)) {
      return {error: 'Tipo inválido no manifesto. Deve ser um dos: ' + CLASSIFICADORES_VALIDOS.join(', ')}
    }

    if(postinfo.fileCount === 0) {
      // register post without items
      // if this is the case, there's no need for a bag, so no need to analise it at all
      await item.create({
        title: postinfo.title,
        description: postinfo.description,
        files: [],
        owner: username,
        classificadores: [tipo],
        isPublic: postinfo.isPublic,
        creationDate: new Date()
      })

      return null
    }


    //assume return on previous if statement

    const bagit_manifest = zip.file('manifest-sha256.txt')
    const bagit_info = zip.file('bagit.txt')
    if(!bagit_manifest || !bagit_info) {
      return {error: `Invalid BagIt bag! Manifest or bagit.txt is missing!`}
    }

    // need to read bagit.txt? maybe not?

    // need to read bagit_manifest! verify each file
    const bagit_manifest_text = await bagit_manifest.async('string')

    // turns each line into a key value pair of filename and hash
    function parseManifest(text) {
      const lines = text.split(/\r?\n/);
      const map = {};
      for (const line of lines) {
        const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i);
        if (match) {
          const [, hash, filepath] = match;
          map[filepath.trim()] = hash.toLowerCase();
        }
      }
      return map;
    }

    const manifest_parsed = parseManifest(bagit_manifest_text)

    //check if all files have respective hash (if they're valid or not)
    for(const [path, expected_hash] of Object.entries(manifest_parsed)) {
      const file = zip.file(path)
      if (!file) {
        return {error: `BagIt bag is invalid! File ${path} does not exist!`}
      }

      const data = await file.async('nodebuffer')
      const hash = crypto.createHash('sha256').update(data).digest('hex')

      if(hash !== expected_hash.toLowerCase()) {
        return {error: `File ${path} is either corrupt or has been tampered with!`}
      }
    }

    // Criar pasta destino: public/fileStore/<username>/<item_id>/
    const itemUUID = uuidv4();
    console.log(itemUUID);
    console.log(username);
    var destFolder = path.join('public', 'fileStore', username, itemUUID);
    fs.mkdirSync(destFolder, { recursive: true });

    const files = Object.values(zip.files)

    //loop through each content file to read all metadata and create a document entry
    let documents = []

    for(const file of files) {
      const relative_path = file.name

      //if it's a bag file, or meta file, ignore
      if (file.dir || !relative_path.startsWith('data/') || relative_path.startsWith('data/meta/')) continue

      const file_name = path.basename(relative_path)
      const meta_path = `data/meta/${file_name}.json`

      let metadata = null
      if(zip.files[meta_path]) {
        const metadata_file_content = await zip.files[meta_path].async('string')
        try {
          metadata = JSON.parse(metadata_file_content)
        }
        catch (err) {
          return {error: err}
        }
      }
      else {
        return {error: `File ${relative_path} does not have a metadata file associated with it!`}
      }

      const main_file_data = await file.async('nodebuffer')

      //now we have both the metadata and actual file data stored

      const filepath = path.join(destFolder, file_name)
      const filepath_curated = filepath.replaceAll(/\\/g, '/')
      fs.writeFileSync(filepath, main_file_data)

      const doc = new document({
        name: file_name,
        originalName: metadata.originalName,
        path: filepath_curated,
        mimetype: metadata.mimetype,
        size: metadata.size
      })

      documents.push(doc)
    }

    var document_ids = []
    for(const doc of documents) {
      document_ids.push(doc._id)
    }

    //create item
    var item_obj = new item({
      title: postinfo.title,
      description: postinfo.description,
      files: document_ids,
      owner: username,
      isPublic: postinfo.isPublic,
      creationDate: new Date()
    })

    for(const doc of documents) {
      await doc.save()
    }
    await item_obj.save()

    return null
  } 
  catch (err) {
    console.error('Erro ao processar ZIP:', err);
    return { error: `Erro ao processar ficheiro ZIP: ${err}` }
  }
}

