var item = require('../models/item');

module.exports.findAll = (userId, classificador) => {
  const filtro = { owner: userId };
  
  if (classificador) {
    filtro.classificadores = classificador;
  }

  return item.find(filtro).exec();
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


module.exports.addComment = async (id, username, text) => {
  const itemDoc = await item.findOne({ _id: id, owner: username }).exec();
  if (!itemDoc) return null;

  itemDoc.comments.push({ text: text });
  return itemDoc.save();
};

