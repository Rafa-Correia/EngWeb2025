var express = require('express');
var router = express.Router();
var axios = require('axios')
var multer = require('multer')
var upload = multer({dest: 'tmp'})
var fs = require('fs')
var jszip = require('jszip')
var crypto = require('crypto');
const { writeHeapSnapshot } = require('v8');

router.get('/', (req, res, next) => {
    axios.get('http://localhost:17000/items', {
        headers: {
            Authorization: `Bearer ${req.cookies.jwt}`
        }
    })
    .then(response => {
        res.render('diaryList', {diaryEntries: response.data, date: new Date().toISOString().slice(0, 10)})
    })
    .catch(err => {
        res.render('error', {error: err})
    })
})

router.get('/create', (req, res, next) => {
    res.render('diaryEntryForm', {date: new Date().toISOString().slice(0, 10)})
})

router.post('/create', upload.array('uploads'), async (req, res, next) => {
    let f_list = req.files
    let n_files = 0
    if(f_list) {
        n_files = f_list.length
    }

    let post = {
        title: req.body.title,
        description: req.body.desc,
        tipo: req.body.tipo,
        isPublic: req.body.isPublic,
        fileCount: n_files
    }


    let zip = new jszip()
    let hashes = []

    zip.file('manifesto-SIP.json', JSON.stringify(post))

    for(const file of f_list) {
        let metadata = {
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        }
        const data = fs.readFileSync(file.path)
        const hash = crypto.createHash('sha256')
        hash.update(data)
        let hash_str = hash.digest('hex')
        const obj = {
            path: `data/${metadata.originalName}`,
            hash: hash_str
        }
        hashes.push(obj)

        zip.file(`data/${metadata.originalName}`, data)
        zip.file(`data/meta/${metadata.originalName}.json`, JSON.stringify(metadata))
    }


    const lines = hashes.map(entry => `${entry.hash} ${entry.path}`)
    const content = lines.join('\n') + '\n' //this last one is for convention?? i thinK?

    zip.file('manifest-sha256.txt', content)
    zip.file('bagit.txt', 'This is a BagIt bag!')

    const bag = await zip.generateAsync({type : 'blob'})

    const file = new File([bag], 'bag.zip', {type : 'application/zip'})

    const formData = new FormData()
    formData.append('file', file)
    //post the bag to the backend server
    axios.post('http://localhost:17000/items/uploadZIP', formData, {
        headers: {
            Authorization: `Bearer ${req.cookies.jwt}`,
        }
    })
    .then(ans => {
        res.redirect('/diary')
    })
    .catch(err => {
        console.log(`Error: ${err}`)
        res.render('error', {error: err})
    })
})

router.get('/:id', (req, res, next) => {
  const itemId = req.params.id

  axios.get(`http://localhost:17000/items/${itemId}`, {
    headers: {
      Authorization: `Bearer ${req.cookies.jwt}`
    }
  })
  .then(response => {
    res.render('item', { item: response.data, date: new Date().toISOString().slice(0, 10) })
  })
  .catch(err => {
    res.render('error', { error: err })
  })
})

router.post('/:id/delete', (req, res) => {
  axios.delete(`http://localhost:17000/items/${req.params.id}`, {
    headers: {
      Authorization: `Bearer ${req.cookies.jwt}`
    }
  })
  .then(() => res.redirect('/diary'))
  .catch(err => res.render('error', { error: err }))
})

router.get('/:id/download', (req, res) => {
  const itemId = req.params.id;

  axios.get(`http://localhost:17000/items/${itemId}/download`, {
    headers: {
      Authorization: `Bearer ${req.cookies.jwt}`
    },
    responseType: 'stream'
  })
  .then(apiRes => {
    // Encaminha headers do ficheiro ZIP
    res.setHeader('Content-Disposition', apiRes.headers['content-disposition'] || `attachment; filename="post_${itemId}.zip"`);
    res.setHeader('Content-Type', apiRes.headers['content-type'] || 'application/zip');

    // Faz pipe da stream da API para a resposta HTTP
    apiRes.data.pipe(res);
  })
  .catch(err => {
    console.error('Erro ao fazer download:', err.message);
    res.render('error', { error: err });
  });
});

router.get('/:id/comment', (req, res, next) => {
    const itemId = req.params.id;

    axios.get(`http://localhost:17000/items/${itemId}/comments`, {
        headers: {
            Authorization: `Bearer ${req.cookies.jwt}`
        }
    })
    .then(response => {
        res.render('comment', {date: new Date().toISOString().slice(0, 10), itemId: itemId})
    })
    .catch(err => {
        res.render('error', {error: err})
    })
})

router.post('/:id/comment', (req, res) => {
  const itemId = req.params.id;

  axios.post(`http://localhost:17000/items/${itemId}/comments`, {
    text: req.body.text
  }, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${req.cookies.jwt}`
    }
  })
  .then(() => res.redirect(`/diary/${itemId}`))
  .catch(err => res.render('error', { error: err }));
});

module.exports = router;