var express = require('express');
var router = express.Router();
var path = require('path');
var uuidv4 = require('uuid').v4;
var itemController = require('../controllers/item');
var multer = require('multer')
var fs = require('fs')
var jszip = require('jszip')
var xml2js = require('xml2js')
var Auth = require('../auth/auth');

var upload = multer({ dest: 'uploads/' })


// GET items
router.get('/', Auth.validate, function(req, res, next) {
    console.log('GET /items');
    itemController.findAll(req.user.username)
        .then(data => res.status(200).jsonp(data))
        .catch(err => res.status(500).jsonp(err));
});


// GET item by id
router.get('/:id', Auth.validate, function(req, res, next) {
    console.log('GET /items/' + req.params.id);
    itemController.findById(req.params.id, req.user._id)
        .then(data => {
            if(data) {
                res.status(200).jsonp(data);
            } else {
                res.status(404).jsonp({ error: 'Item not found' });
            }
        })
        .catch(err => res.status(500).jsonp(err));
});


// POST item with file upload
router.post('/uploadZip', validate, upload.single('file'), async (req, res) => {
  try {
    const zipPath = req.file.path;
    const zipBuffer = fs.readFileSync(zipPath);
    const zip = await jszip.loadAsync(zipBuffer);

    // Verificar se tem manifesto
    const manifestoFile = zip.file('manifesto-SIP.json') || zip.file('manifesto-SIP.xml');
    if (!manifestoFile) {
      return res.status(400).json({ error: 'Ficheiro manifesto-SIP.(json|xml) não encontrado.' });
    }

    // Ler o manifesto
    let metadata;
    const manifestoContent = await manifestoFile.async('string');
    if (manifestoFile.name.endsWith('.json')) {
      metadata = JSON.parse(manifestoContent);
    } else {
      const parsed = await xml2js.parseStringPromise(manifestoContent);
      metadata = parsed;
    }

    // Criar pasta destino: public/fileStore/<user_id>/<item_id>/
    const itemUUID = uuidv4();
    const destFolder = path.join('public', 'fileStore', req.user._id.toString(), itemUUID);
    fs.mkdirSync(destFolder, { recursive: true });

    // Extrair os ficheiros (exceto o manifesto)
    for (const name of Object.keys(zip.files)) {
      if (!name.startsWith('manifesto-SIP')) {
        const content = await zip.file(name).async('nodebuffer');
        const filePath = path.join(destFolder, path.basename(name));
        fs.writeFileSync(filePath, content);
      }
    }

    // Criar item
    const itemData = {
      title: metadata.title || 'Pacote ZIP',
      type: 'zip',
      file: destFolder.replace(/\\/g, '/'),
      metadata: metadata,
      owner: req.user.username,
      creationDate: new Date()
    };

    const result = await itemController.create(itemData);
    res.status(201).jsonp(result);
  } catch (err) {
    console.error('Erro ao processar ZIP:', err);
    res.status(500).json({ error: 'Erro ao processar ficheiro ZIP' });
  }
});


// DELETE item
router.delete('/:id', Auth.validate, function(req, res, next) {
    console.log('DELETE /items/' + req.params.id);
    itemController.delete(req.params.id, req.user.username)
        .then(data => {
            if(data) {
                res.status(200).jsonp(data);
            } else {
                res.status(404).jsonp({ error: 'Item not found' });
            }
        })
        .catch(err => res.status(500).jsonp(err));
});

module.exports = router;