const mongoose = require("mongoose");

const connection_url =
	"mongodb+srv://admin:g7sNt8vAmCzleAob@cluster0.si8ju.mongodb.net/milkTeaBotDB?retryWrites=true&w=majority";

mongoose.connect(connection_url, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

const MeoMeoSchema = mongoose.Schema({
	groupChatId: String,
	groupName: String,
	bossList: [
		{
			bossId: String,
			bossChatId: String,
			timeAdd: String,
		},
	],
	dateManage:[
		{
			timeStamp: String,
			peopleEat: [
				{
					name: String,
					isPay: Boolean,
					idMess: Number
				}
			]
		}
	]
});

const MilkTeaDB = mongoose.model("MilkTeaContent", MeoMeoSchema);
module.exports = MilkTeaDB;
