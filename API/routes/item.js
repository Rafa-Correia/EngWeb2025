var express = require('express');
var router = express.Router();
var path = require('path');
var itemController = require('../controllers/item');
var multer = require('multer')
var fs = require('fs')
var jszip = require('jszip')
var Auth = require('../auth/auth');
var logger = require('../utils/logger')

var upload = multer({ dest: 'uploads/' })


// <================================= REMOVE THIS
var documentModel = require('../models/document')
var itemModel = require('../models/item')
// =============================================>

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

router.get('/public/:id/download', async function(req, res, next) {
  try {
    let post = await itemController.findPublic(req.params.id)
    if(!post) {
      res.status(404).json({message: 'Not found.'})
      return
    }
    const zip = new jszip() //this is the zip file we'll be sending back to the user

    //create the manifesto-DIP.json??
    zip.file('manifesto-DIP.json', JSON.stringify(post))

    let document_ids = post.files

    let docs = []

    for (d_id of document_ids) {
      let doc = await documentModel.findById(d_id).exec()
      docs.push(doc)
    }

    for (const doc of docs) {
      //now we're looping through each document of the post
      //means we can actually have the metadata and the path to the file in the store
      let metadata = {
        mimetype: doc.mimetype,
        lastModified: doc.lastModified
      }

      let fileData = await fs.promises.readFile(doc.path)

      zip.file(`data/${doc.name}`, fileData)
      zip.file(`data/meta/${doc.name}.json`, JSON.stringify(metadata))
    }

    let zipData = await zip.generateAsync({type : 'nodebuffer'})
    res.status(200).set({
      'Content-Type': 'application/zip'
    }).send(zipData)
  } catch(err) {
    console.log(err)
    res.status(500).json({error: err})
  }
})


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
    itemController.findById(req.params.id, req.user.username)
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

//  THIS IS THE INGEST!
router.post('/uploadZip', Auth.validate, upload.single('file'), (req, res) => {
  console.log('Calling ingest...')
  itemController.ingest(req.file.path, req.user.username)
    .then(result => {
      console.log('Done!')
      if(result) { //function returns null if everything is okay!
        console.log(result)
        res.status(400).json(result)
      }
      else {
        res.status(201).json({message: "Post created successfully!"})
      }
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({error: err})
    })
});


// GET item as ZIP (DIP) PS: I think this works, it might or it might not ERRO!!!!!!!!!!!!!!!!!!!!!!!!!!
router.get('/:id/download', Auth.validate, async function(req, res, next) {
  //console.log('GET /items/' + req.params.id + '/download');

  try {
    let post = await itemController.findById(req.params.id, req.user.username)

    if(!post) {
      res.status(404).json({message: 'Not found.'})
      return
    }
    const zip = new jszip() //this is the zip file we'll be sending back to the user

    //create the manifesto-DIP.json??
    zip.file('manifesto-DIP.json', JSON.stringify(post))

    let document_ids = post.files

    let docs = []

    for (d_id of document_ids) {
      let doc = await documentModel.findById(d_id).exec()
      docs.push(doc)
    }

    for (const doc of docs) {
      //now we're looping through each document of the post
      //means we can actually have the metadata and the path to the file in the store
      let metadata = {
        mimetype: doc.mimetype,
        lastModified: doc.lastModified
      }

      let fileData = await fs.promises.readFile(doc.path)

      zip.file(`data/${doc.name}`, fileData)
      zip.file(`data/meta/${doc.name}.json`, JSON.stringify(metadata))
    }

    let zipData = await zip.generateAsync({type : 'nodebuffer'})
    res.status(200).set({
      'Content-Type': 'application/zip'
    }).send(zipData)
  } catch(err) {
    console.log(err)
    res.status(500).json({error: err})
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
    const item = await itemController.addComment(req.params.id, text);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado.' });
    }

    res.status(200).json({ message: 'Comentário adicionado.', item: item });
  } catch (err) {
    console.error('Erro ao adicionar comentário:', err);
    res.status(500).json({ error: 'Erro ao adicionar comentário.' });
  }
});


// GET /:id/comments
router.get('/:id/comments', Auth.validate, function(req, res, next) {
  console.log('GET /items/' + req.params.id + '/comments');

  itemController.findPublicById(req.params.id)
    .then(item => {
      if (item) {
        res.status(200).jsonp(item.comments);
      } else {
        res.status(404).jsonp({ error: 'Item not found' });
      }
      logger.logAction(req.user.username, 'view_comments', req.params.id); // testing
    })
    .catch(err => {
      console.error('Erro ao obter comentários:', err);
      res.status(500).jsonp({ error: 'Erro ao obter comentários.' });
    });
});


module.exports = router;