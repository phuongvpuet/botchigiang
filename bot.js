require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const getTimeStamp = require("./utility");
bot.hiddenPass = "11@899";
bot.on("polling_error", (err) => console.log(err));
bot.lastRequest = {};
bot.groupId = "-558532071";
bot.timeNotify = "09:30";

// ---------- LOGGIN FEATURES ----------
var util = require("util");
var log_stdout = process.stdout;
console.log = function (d) {
	//
	log_stdout.write(util.format(d) + "\n");
};
//logger
const logger = {};
logger.info = (d) => {
	console.log("[INFO] (" + getTimeStamp(new Date()) + ") " + util.format(d));
};
logger.debug = (d) => {
	console.log("[DEBUG] ( " + getTimeStamp(new Date()) + ") " + util.format(d));
};
logger.warn = (d) => {
	console.log("[WARN] (" + getTimeStamp(new Date()) + ") " + util.format(d));
};
logger.error = (d) => {
	console.log("[ERROR] (" + getTimeStamp(new Date()) + ") " + util.format(d));
};
const notifyErr = "Em đang lỗi tí ạ, request lại sau ít phút nữa nhé!";
//DB
const MilkTeaDB = require("./mongo.js");
// ---------- LOGGIN FEATURES END ----------

logger.debug("Da Khoi Dong Bot");
//
function dbCreateGroup(msg) {
	logger.info("CREATE new Database")
	let tmp = {
		groupChatId: msg.chat.id,
		groupName: msg.chat.title,
		bossList: [],
		dateManage: [],
	};
	//Create new doc
	MilkTeaDB.create(tmp, (err, data) => {
		if (err) {
			logger.info("Failed when creating db for group " + msg.chat.title);
			logger.error(err);
		} else {
			logger.info(
				"Create db for group chat " + msg.chat.title + " successfully"
			);
			bot.sendMessage(
				msg.chat.id,
				"Hi, lần đầu được vào group thích quá ạ, cảm ơn " +
				getUserName(msg.from) +
				" nhé! ^.^",
				{ parse_mode: "Markdown" }
			);
		}
	});
}
bot.on("message", (msg) => {
	//logger.debug(msg);
	if (msg.chat.type === 'group') {
		// logger.info(msg.from.id);
		// logger.info(msg.text);
		if (msg.from.id == 881241297 && msg.text == "hi") {
			createDataBase(msg.message_id, msg.from, msg.chat, msg.text, msg);
		}
	}
});
function isGroupCommand(msg){
	return (msg.chat.type === "group" && msg.entities && msg.entities[0]["offset"] == 0)
}

function isPrivateCommand(msg){
	return (msg.chat.type === "private" && msg.entities && msg.entities[0]["offset"] == 0)
}

//Command
bot.onText(/\/ancom/, (msg) => {
	if (msg.chat.type === "private") addPeopleEat(msg.message_id, msg.from, msg.chat, msg.text, msg);
});
bot.onText(/\/dongtien/, (msg) => {
	if (isGroupCommand(msg)) dongTien(msg.message_id, msg.from, msg.chat, msg.text, msg);
});
bot.onText(/\/aichuadongtien/, (msg) => {
	if (isGroupCommand(msg)) aiChuaDongTien(msg.message_id, msg.from, msg.chat, msg.text, msg);
});
bot.onText(/\/help/, (msg) => {
	if (isGroupCommand(msg)) getHelp(msg.message_id, msg.from, msg.chat, msg.text, msg);
});
bot.onText(/\/makeboss/, (msg) => {
	if (msg.chat.type === "private") makeBoss(msg.message_id, msg.from, msg.chat, msg.text, msg);
});
bot.onText(/\/d/, (msg) => {
	if (isPrivateCommand(msg)) confirmPay(msg.message_id, msg.from, msg.chat, msg.text, msg);
});
function aiChuaDongTien(messId, from, chat, text, msg) {
	logger.debug("Ai chua dong tien!");
	MilkTeaDB.findOne({ groupChatId: chat.id }, (err, group) => {
		if (err) {
			logger.err(err);
			bot.sendMessage(chat.id, notifyErr);
		}
		else {
			if (!group.groupName) {
				group.groupName = msg.chat.title;
			}
			doNotifyNotPay(group);
		}
	})
}

function doNotifyNotPay(group){
	let notPay = [];
	let dateManage = group.dateManage;
	//logger.debug(peopleLate);
	for (let i = 0; i < dateManage.length; i++) {
		let day = dateManage[i];
		for (let j = 0; j < day.peopleEat.length; j++) {
			let person = day.peopleEat[j];
			if (!person.isPay) {
				notPay.push({
					name: person.name
				});
			}
		}
	}
	if (dateManage.length < 1){
		bot.sendMessage(group.groupChatId, "Chưa có ai trong danh sách ạ!");
		return;
	}
	if (notPay.length < 1) {
		bot.sendMessage(group.groupChatId, "Tất cả mọi người đã đóng tiền đầy đủ ạ!");
		return;
	}
	logger.debug(notPay);
	let text = "Danh sách chưa đóng tiền:\n";
	notPay.forEach((info, idx) => {
		text += (idx + 1) + ". " + info.name + ".\n";
	});
	bot.sendMessage(group.groupChatId, text);
}
function getHelp(messId, from, chat, text, msg) {
	logger.debug("Giup do!")
	let tmp = "Hi , hãy dùng các lệnh sau nhé:\n- /dongtien: Confirm đã đóng tiền ăn.\n- /aichuadongtien: Xem ai chưa đóng tiền.\n- /help: Xem giúp đỡ!";
	bot.sendMessage(chat.id, tmp);
}

function makeBoss(messId, from, chat, text, msg) {
	if (text.split(" ").length < 3) {
		bot.sendMessage(
			chat.id,
			"Sai cú pháp, hãy dùng /makeBoss password groupId"
		);
		return;
	}
	let pass = text.split(" ")[1];
	let groupId = text.split(" ")[2];
	if (pass.toLowerCase() === bot.hiddenPass) {
		MilkTeaDB.findOne({ groupChatId: groupId }, (err, group) => {
			if (err) {
				bot.sendMessage(chat.id, "Khong tim thay group nao!");
				logger.error(err);
			} else {
				if (!checkIfIsBoss(from, group, chat)) {
					addMoreBossToGroup(from, group, chat);
				}
			}
		});
	} else {
		bot.sendMessage(chat.id, "Mật khẩu không chính xác!");
	}
}
function checkIfIsBoss(boss, group, chat) {
	let isBoss = false;
	let listBoss = group.bossList;
	for (let i = 0; i < listBoss.length; i++) {
		if (listBoss[i].bossId - boss.id == 0) {
			bot.sendMessage(chat.id, "Bạn đã là boss rồi!");
			isBoss = true;
			break;
		}
	}
	return isBoss;
}
function addMoreBossToGroup(bossInfo, group, chat) {
	let listBoss = group.bossList;
	var time = getTimeNow();
	let newBoss = {
		bossId: bossInfo.id,
		bossChatId: chat.id,
		timeAdd: time.datetime
	};
	listBoss.push(newBoss);
	group.save((err) => {
		if (err) bot.sendMessage(chat.id, "Tao boss bi loi!");
		else {
			listBoss.forEach((boss) => {
				bot.sendMessage(
					boss.bossChatId,
					"Thêm quyền boss cho " + getUserName(bossInfo),
					{ parse_mode: "Markdown" }
				);
			});
		}
	});
}
function createDataBase(messId, from, chat, text, msg) {
	MilkTeaDB.findOne({ groupChatId: msg.chat.id }, (err, group) => {
		if (err) {
			logger.error(err);
		}
		if (!group) {
			dbCreateGroup(msg);
			logger.info("Pika just join group " + msg.chat.title);
		}

	});
}
function addPeopleEat(messId, from, chat, text, msg) {
	logger.info("Them nguoi an com");
	let info = text.split(' ');
	let opts = { reply_to_message_id: messId };
	if (info.length !== 2) {
		bot.sendMessage(chat.id, "Sai cú pháp: Hãy dùng /ancom Tên_người_ăn", opts);
		return;
	}
	MilkTeaDB.findOne({ groupChatId: "-558532071" }, (err, group) => {
		if (err || !group) {
			logger.error(err);
			bot.sendMessage(chat.id, notifyErr);
		} else {
			let data = getTimeNow();
			let listBoss = group.bossList;
			let isBoss = false;
			for (let i = 0; i < listBoss.length; i++){
				if (listBoss[i].bossId == from.id) {
					isBoss = true;
					break;
				}
			}
			if (!isBoss){
				bot.sendMessage(chat.id, "Lêu lêu boss mới dùng lệnh đó được nhé", opts);
				return;
			}
			//if exist
			let dateManage = group.dateManage;
			let timeStamp = data.todayTimeStamp;
			logger.info(timeStamp);
			let today = undefined;
			for (let i = 0; i < dateManage.length; i++){
				if (dateManage[i].timeStamp == timeStamp) today = dateManage[i];
			}
			let isToday = true;
			if (!today) {
				isToday = false;
				today = {
					timeStamp: timeStamp,
					peopleEat: [],
				};
			}
			let name = "";
			info.forEach((text, i) =>{if (i > 0) name += (text + " ");});
			name += ("(" + data.datetime.slice(5, 10) + ")");
			logger.debug(name);
			let people = {
				name: name,
				isPay: false,
				idMess: messId
			}
			today.peopleEat.push(people);
			//
			if (!isToday) group.dateManage.push(today);
			group.save((err) => {
				if (err) {
					logger.info(err);
					bot.sendMessage(chat.id, notifyErr)
				}
				else {
					bot.sendMessage(chat.id, "Thêm thành công " + name);
				}
			})
		}
	});
}

function dongTien(messId, from, chat, text, msg) {
	logger.info("Dong tien");
	MilkTeaDB.findOne({ groupChatId: chat.id }, (err, group) => {
		if (err || !group) {
			logger.error(err);
			bot.sendMessage(chat.id, notifyErr);
		} else {
			let opts = { reply_to_message_id: messId, parse_mode: "Markdown" };
			let listBoss = group.bossList;
			let dateManage = group.dateManage;
			let keyboard = [];
			let column = 3;
			let cnt = 0;
			let row = [];
			for (let i = 0; i < dateManage.length; i++){
				let day = dateManage[i];
				//logger.debug(day);
				for (let j = 0; j < day.peopleEat.length; j++){
					let person = day.peopleEat[j];
					if (!person.isPay) {
						row.push("/d|" + person.name + "|" + chat.id + "|" + person.idMess);
						cnt++;
					}
					if (cnt >= column) {
						cnt = 0;
						keyboard.push([...row]);
						row = [];
					}
				}
			}
			if (row.length > 0) keyboard.push(row);
			if (dateManage.length > 0) {
				let rep = "Ok ạ, đợi chị Giang check tài khoản đã nhé!";
				bot.sendMessage(chat.id, rep, opts);
			} else if (keyboard.length < 1) {
				bot.sendMessage(chat.id, "Mọi người đóng đủ hết rồi ạ!", opts);
			} else {
				bot.sendMessage(chat.id, "Danh sách có ai đâu mà đóng", opts);
				return;
			}
			let reply = {
				reply_markup:{
					keyboard:keyboard,
					resize_keyboard: true,
					one_time_keyboard: true,
				},
				parse_mode: "Markdown"
			}
			logger.debug(keyboard);
			listBoss.forEach((boss) => {
				bot.sendMessage(
					boss.bossChatId,
					getUserName(from) + " vừa báo đóng tiền ăn, xác nhận bằng cách chọn bên dưới:",
					reply
				);
			});
		}
	});
}

function confirmPay(messId, from, chat, text, msg) {
	logger.debug("Confirm Pay");
		let messText = msg.text;
		let textSplit = messText.split('|');
		let dateId = textSplit[textSplit.length - 1];
		let groupId = textSplit[textSplit.length - 2]
		logger.debug(textSplit);
		MilkTeaDB.findOne({ groupChatId: groupId }, (err, group) => {
			if (err) {
				logger.error(err);
				bot.sendMessage(chat.id, "Error");
			} else {
				let dateManage = group.dateManage;
				//find in old lis
				for (let i = 0; i < dateManage.length; i++) {
					let day = dateManage[i];
					for (let j = 0; j < day.peopleEat.length; j++){
						let person = day.peopleEat[j];
						if (person.idMess == dateId && !person.isPay){
							person.isPay = true;
							group.save((err) => {
								if (err) {
									logger.info(err);
									bot.sendMessage(chat.id, notifyErr)
								}
								else {
									bot.sendMessage(chat.id, "Xác nhận thành công cho " + person.name);
								}
							});
							return;
						}
					}
				}
			}
		});
}
function getTimeNow() {
	var date = new Date();
	var time = date.getTime();
	var offset = -420 * 60000;
	var localTime = time - offset;
	var dateNow = new Date(localTime);
	var dateTime = {};
	dateTime.datetime = dateNow.toJSON();
	dateTime.day_of_week = dateNow.getDay();
	dateTime.week_number = getWeekNumber(dateNow);
	dateTime.timeStamp = localTime;
	let todayTimeStamp = new Date().setHours(0, 0, 0, 0);
	dateTime.todayTimeStamp = new Date(todayTimeStamp).getTime() / 1000;
	return dateTime;
}
function getWeekNumber(date) {
	let onejan = new Date(date.getFullYear(), 0, 1);
	let week = Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
	return week;
}
function getUserName(from) {
	if (from.bossId) return "[" + "Boss" + "](tg://user?id=" + from.bossId + ")"
	if (from.username) return "[" + from.username + "](tg://user?id=" + from.id + ")"
	else return "[" + "Bạn chưa có username" + "](tg://user?id=" + from.id + ")"
}
function getWowSticker() {
	let stickers = [
		"CAACAgUAAxkBAAIJbl-EX5Z1r2-n03pJcXz5g0v0n959AAJNAAPIx3IZfL_87seKFOEbBA",
		"CAACAgUAAxkBAAIJb1-EX8DIaSaHG84IQEqfL3lsM_h6AAJPAAPIx3IZKhWZpbpa-BAbBA",
		"CAACAgUAAxkBAAIJcF-EYAqUhnkKgaMDNo0Ur8StMQ6MAAJGAAPIx3IZcVUZOdSgJMEbBA",
		"CAACAgUAAxkBAAIJcV-EYCP2PgUG8Kk89TQJE6qDgRERAAJFAAPIx3IZToegM-2-hgYbBA",
		"CAACAgUAAxkBAAIJcl-EYDfgV_Ij-VQIGZy68MQHrx89AAJtAAPIx3IZ3zBn7kagAAEBGwQ",
		"CAACAgUAAxkBAAIJc1-EYEhIhraFzYU4i1CM7diXjTx3AAJ_AAPIx3IZ9g66xfKOWDAbBA",
		"CAACAgEAAxkBAAIJdF-EYHVkCoTCaWy-Q2u4B2meSwsuAALyAAPWL5sGQBXeoGNKDaUbBA",
	]
	return stickers[Math.floor(Math.random() * stickers.length)];
}
function getSadSticker() {
	let stickers = [
		"CAACAgUAAxkBAAIJfl-EYky7xllrwVX_IqzXKVzQDYPBAAJPAAPIx3IZKhWZpbpa-BAbBA",
		"CAACAgUAAxkBAAIJf1-EYmnd8FnE18ESAaDITj-LgRt1AAJIAAPIx3IZtaWWM_jsugYbBA",
		"CAACAgUAAxkBAAIJgF-EYnsdkcaJJDCPdHJrimLShVPZAAJSAAPIx3IZ-mAQ1SlGnBAbBA",
		"CAACAgUAAxkBAAIJgV-EYo7Z1hKFT5utkKc-k3WR8qvCAAJ0AAPIx3IZTQSMYQxaOv8bBA",
		"CAACAgIAAxkBAAIJgl-EYrLz6suTGR-UuJ6FYTiyqOhGAAK6AgADOKAKGr6MyZ5qzhobBA",
		"CAACAgIAAxkBAAIJg1-EYr0dKTX5xylo619-pARnT18IAALEAgADOKAK3SbLzFjNfk0bBA",
		"CAACAgIAAxkBAAIJhF-EYtD0FO9Ju9eqUAn3Ov1-UToFAAIIAQAC9wLID90BAAHsytBr5RsE",
		"CAACAgEAAxkBAAIJhV-EYt0yvjoLCmIazFnb04PHKkO7AAL8AAPWL5sGIVdlGEbo3twbBA",
	]
	return stickers[Math.floor(Math.random() * stickers.length)];
}
checkEveryMinute = () => {
	var data = getTimeNow();
	MilkTeaDB.find((err, groups) => {
		if (err) {
			logger.error(err);
		} else {
			let hours = data.datetime.slice(11, 16);
			//
			if (hours == bot.timeNotify) groups.forEach(group =>{
				if (group.groupChatId == bot.groupId) {
					bot.sendMessage(group.groupChatId, "Thông báo mặc định lúc " + bot.timeNotify + " ^^")
					doNotifyNotPay(group);
				}
			})

		}
	});
};

setInterval(checkEveryMinute, 60000);