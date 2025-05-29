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
var logs = require('../utils/logger')

var upload = multer({ dest: 'uploads/' })

const CLASSIFICADORES_VALIDOS = [ 'foto', 'viagem', 'trabalho', 'formacao', 'evento', 'desporto', 'saude' ];


// GET /public/items
router.get('/public/items', async function(req, res) {
  try {
    const items = await itemController.findPublic();
    res.status(200).jsonp(items);
  } catch (err) {
    res.status(500).jsonp({ error: 'Erro a obter itens públicos.' });
  }
});


// GET /public/items/:id
router.get('/public/items/:id', async function(req, res) {
  try {
    const item = await itemController.findPublicById(req.params.id);
    if (item) {
      res.status(200).jsonp(item);
    } else {
      res.status(404).jsonp({ error: 'Item não encontrado ou não é público.' });
    }
  } catch (err) {
    res.status(500).jsonp({ error: 'Erro a obter item.' });
  }
});


// GET items
router.get('/', Auth.validate, function(req, res, next) {
  console.log('GET /items');

  const filtroClassificador = req.query.classificador;

  itemController.findAll(req.user.username, filtroClassificador)
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
    logger.logAction(req.user.username, 'view', req.params.id); // needs testing
});


// POST item with file upload
router.post('/uploadZip', Auth.validate, upload.single('file'), async (req, res) => {
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

    const tipo = metadata.tipo; // ex: "viagem"

    if (!CLASSIFICADORES_VALIDOS.includes(tipo)) {
      return res.status(400).json({
        error: 'Tipo inválido no manifesto. Deve ser um dos: ' + CLASSIFICADORES_VALIDOS.join(', ')
      });
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
      classificadores: [tipo],
      owner: req.user.username,
      isPublic: metadata.public === true, // default: false se não vier nada
      creationDate: new Date()
    };



    const result = await itemController.create(itemData);
    res.status(201).jsonp(result);
  } catch (err) {
    console.error('Erro ao processar ZIP:', err);
    res.status(500).json({ error: 'Erro ao processar ficheiro ZIP' });
  }
});


// GET item as ZIP (DIP) PS: I think this works, it might or it might not
router.get('/:id/download', Auth.validate, async (req, res) => {
  try {
    // Verificar se o item existe e é do tipo ZIP (Pode ser preferivel fazer outra verificação que nao zip)
    const item = await itemController.findById(req.params.id, req.user._id);
    if (!item || item.type !== 'zip') {
      return res.status(404).json({ error: 'Item não encontrado ou inválido.' });
    }

    logger.logAction(req.user.username, 'download', req.params.id); // needs testing

    // Criar o zip e adicionar o manifesto
    const zip = new jszip();
    zip.file('manifesto-SIP.json', JSON.stringify(item.metadata, null, 2));

    // Adicionar os ficheiros do item
    const basePath = path.join(__dirname, '..', item.file);
    const files = await fs.readdir(basePath);
    for (const f of files) {
      const content = await fs.readFile(path.join(basePath, f));
      zip.file(f, content);
    }

    // Enviar o zip
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="DIP-${item._id}.zip"`
    });
    res.send(buffer);
  } catch (err) {
    console.error('Erro ao gerar ZIP do item:', err);
    res.status(500).json({ error: 'Erro ao gerar ZIP do item.' });
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


// SET visibility PS: ISTO É UM PATCH VISTO Q È SÒ PARA ATUALIZAR O PARAMETRO isPublic
router.patch('/:id/visibility', Auth.validate, async (req, res) => {
  const visibilidade = req.body.isPublic;

  if (typeof visibilidade !== 'boolean') {
    return res.status(400).json({ error: 'Campo isPublic inválido (deve ser true ou false).' });
  }

  try {
    const result = await itemController.setVisibility(req.params.id, req.user.username, visibilidade);
    if (!result) {
      return res.status(404).json({ error: 'Item não encontrado ou não pertence ao utilizador.' });
    }
    res.status(200).json({ message: 'Visibilidade atualizada com sucesso.', item: result });
  } catch (err) {
    console.error('Erro ao atualizar visibilidade:', err);
    res.status(500).json({ error: 'Erro ao atualizar visibilidade.' });
  }
});


// POST /:id/comments
router.post('/:id/comments', Auth.validate, async (req, res) => {
  const text = req.body.text;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Texto do comentário é obrigatório.' });
  }

  try {
    const item = await itemController.addComment(req.params.id, req.user.username, text);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado ou não pertence ao utilizador.' });
    }

    res.status(200).json({ message: 'Comentário adicionado.', item: item });
  } catch (err) {
    console.error('Erro ao adicionar comentário:', err);
    res.status(500).json({ error: 'Erro ao adicionar comentário.' });
  }
});


// GET /:id/comments
router.get('/:id/comments', Auth.validate, async (req, res) => {
  try {
    const item = await itemController.findById(req.params.id, req.user._id);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    res.status(200).json(item.comments);
  } catch (err) {
    console.error('Erro ao obter comentários:', err);
    res.status(500).json({ error: 'Erro ao obter comentários.' });
  }
});




module.exports = router;