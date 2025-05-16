var item = require('../models/item');

module.exports.findAll = (username) => {
    return item.find({owner : username}).exec()
}

module.exports.findById = (id, userId) => {
  return item.findOne({ _id: id, owner: userId }).exec();
};

module.exports.create = async (itemData) => {
    const newitem = new item(itemData);
    return newitem.save();
}

module.exports.delete = (id, username) => {
    console.log('id: ' + id + '  |   username: ' + username)
    //item.find({ _id: id, owner: username}).then(doc => console.log(doc))
    return item.findOneAndDelete({_id : id, owner : username}).exec();
}
