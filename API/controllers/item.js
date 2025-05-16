var item = require('../models/item');

module.exports.findAll = (userId) => {
    return item.find({owner : userId}).exec()
}

module.exports.create = async (itemData) => {
    const newitem = new item(itemData);
    return newitem.save();
}

module.exports.delete = (id, userId) => {
    return item.findOneAndDelete({_id : id, owner : userId}).exec();
}
