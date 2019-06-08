const express = require("express");
const app = express();
const body_parser = require("body-parser");
const fs = require("fs");

let tmp_short = JSON.parse(fs.readFileSync("data/short_codes.json", "utf-8"));
Object.keys(tmp_short).forEach(short_code => {
	let user = JSON.parse(fs.readFileSync(`users/${tmp_short[short_code]}.json`));
	user.short = short_code;
	fs.writeFileSync(`users/${tmp_short[short_code]}.json`, JSON.stringify(user));
});

app.use(body_parser.json())

app.use("*", (req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.get("/", (req, res) => {
	res.send("Functioning");
});

app.post("/save_data", (req, res) => {
	if(fs.existsSync(`users/${req.body.user}.json`)) {
		let user = JSON.parse(fs.readFileSync(`users/${req.body.user}.json`, "utf-8"));

		user.schedules = req.body.schedules;
		user.assignments = req.body.assignments;

		fs.writeFileSync(`users/${req.body.user}.json`, JSON.stringify(user));
		res.status(200);
		res.json({
			status: 200
		});
	} else {
		res.status(404);
		res.json({
			status: 404
		});
	}
});
app.post("/apply_all", (req, res) => {
	if(fs.existsSync(`users/${req.body.user}.json`)) {
		
		let user = JSON.parse(fs.readFileSync(`users/${req.body.user}.json`, "utf-8"));

		if(!user.schedules) user.schedules = [];
		if(!user.assignments) user.assignments = [];

		let schedules = user.schedules;
		let assignments = user.assignments;
		let all_schedules = JSON.parse(fs.readFileSync("data/all_schedules.json", "utf-8"));
		let all_assignments = JSON.parse(fs.readFileSync("data/all_assignments.json", "utf-8"));

		assignments.forEach(assignment => {
			assignment.local_save = new Date().getTime();
			assignment.last_saved = new Date().getTime() + 1e3;
			if(!all_assignments[assignment.id] || all_assignments[assignment.id].author == req.body.user) {
				assignment.author = req.body.user;
				all_assignments[assignment.id] = assignment;
			}
		});

		schedules.forEach(schedule => {
			schedule.local_save = new Date().getTime();
			schedule.last_saved = new Date().getTime() + 1e3;
			if(!all_schedules[schedule.id] || all_schedules[schedule.id].author == req.body.user) {
				schedule.author = req.body.user;
				all_schedules[schedule.id] = schedule;
			}
		});

		fs.writeFileSync("data/all_schedules.json", JSON.stringify(all_schedules));
		fs.writeFileSync("data/all_assignments.json", JSON.stringify(all_assignments));
		
		let assigned_students = JSON.parse(fs.readFileSync("data/assigned_students.json"));
		if(assigned_students[req.body.user]) {

			console.log("[APPLYING] ---");

			let users = [];
			let user_list = assigned_students[req.body.user];
			let short_codes = JSON.parse(fs.readFileSync("data/short_codes.json"));
			user_list.forEach(short_code => {
				if(short_codes[short_code]) {

					let student = JSON.parse(fs.readFileSync(`users/${short_codes[short_code]}.json`, "utf-8"));
					if(!student.schedules) student.schedules = [];
					if(!student.assignments) student.assignments = [];
					
					schedules.forEach(schedule => {
						if(schedule.students.includes(short_code) && !student.schedules.includes(schedule.id)) {
							student.schedules.push(schedule.id);
						} else if(student.schedules.includes(schedule.id) && !schedule.students.includes(short_code)) {
							student.schedules.splice(student.schedules.indexOf(schedule.id), 1);
						}
					});

					assignments.forEach(assignment => {
						if(assignment.students.includes(short_code) && !student.assignments.includes(assignment.id)) {
							student.assignments.push(assignment.id);
						} else if(student.assignments.includes(assignment.id) && !assignment.students.includes(short_code)) {
							student.assignments.splice(student.assignments.indexOf(assignment.id), 1);
						}
					});

					fs.writeFileSync(`users/${short_codes[short_code]}.json`, JSON.stringify(student, null, "\t"));
					console.log("[APPLIED] Schedules applied for " + student.first_name + " " + student.last_name);
				}
			});
		}

		fs.writeFileSync(`users/${req.body.user}.json`, JSON.stringify(user));
		res.status(200);
		res.json({
			status: 200,
			schedules: schedules,
			assignments: assignments
		});

	} else {
		res.status(404);
		res.json({
			status: 404
		});
	}
});
app.post("/get_schedules", (req, res) => {
	if(fs.existsSync(`users/${req.body.user}.json`)) {
		let user = JSON.parse(fs.readFileSync(`users/${req.body.user}.json`, "utf-8"));
		res.json(user.schedules);
	} else {
		res.status(404);
		res.json({
			status: 404
		});
	}
});
app.post("/get_assignments", (req, res) => {
	if(fs.existsSync(`users/${req.body.user}.json`)) {
		let user = JSON.parse(fs.readFileSync(`users/${req.body.user}.json`, "utf-8"));
		res.json(user.assignments);
	} else {
		res.status(404);
		res.json({
			status: 404
		});
	}
});
app.post("/get_students", (req, res) => {
	let assigned_students = JSON.parse(fs.readFileSync("data/assigned_students.json"));
	if(assigned_students[req.body.user]) {
		let users = [];
		let user_list = assigned_students[req.body.user];
		let short_codes = JSON.parse(fs.readFileSync("data/short_codes.json"));

		user_list.forEach(short => {
			
			let id = short_codes[short];

			if(fs.existsSync(`users/${id}.json`)) {
				let user = JSON.parse(fs.readFileSync(`users/${id}.json`));
				let img_src = short;

				if(!fs.existsSync(`public/img/${img_src}.png`)) {
					img_src = "default_user";
				}

				users.push({
					first_name: user.first_name,
					last_name: user.last_name,
					full_name: user.first_name + " " + user.last_name,
					short: short,
					img: img_src,
					year: user.year
				});
			} else {
				users.push(404);
			}
		});

		res.json(users);
	} else {
		res.status(404);
		res.json({
			status: 404
		});
	}
});

app.post("/get_student", (req, res) => {

	if(fs.existsSync(`users/${req.body.user}.json`)) {

		let user = JSON.parse(fs.readFileSync(`users/${req.body.user}.json`, "utf-8"));
		let all_assignments = JSON.parse(fs.readFileSync("data/all_assignments.json", "utf-8"));
		let all_schedules = JSON.parse(fs.readFileSync("data/all_schedules.json", "utf-8"));

		let dates = {}
		user.schedules.forEach(schedule_id => {
			let schedule = all_schedules[schedule_id];

			let sc_is_a_thing = false;
			let l_author = JSON.parse(fs.readFileSync(`users/${schedule.author}.json`));

			l_author.schedules.forEach(schedule_alt => {
				if(schedule_alt.id == schedule.id) {
					sc_is_a_thing = true;
				}
			});

			if(!schedule || !sc_is_a_thing) return;
			Object.keys(schedule.streak_starts).forEach(start_str => {
				let start_date = getDateFromStr(start_str);
				let length = schedule.streak_starts[start_str];

				for(let i = 0; i < length; i++) {
					let d = new Date(start_date.getTime() + (1000 * 60 * 60 * 24 * i));
					let new_date_str = getDateStr(d);
					if(!dates[new_date_str]) {
						dates[new_date_str] = {
							subjects: [],
							assignments: {}
						}
					}

					if(schedule.days[i]) {
						let subjects = schedule.days[i].subjects;
						for(let j = 0; j < subjects.length; j++) {
							subjects[j].time = schedule.times[j];
						}
						dates[new_date_str].subjects = [...dates[new_date_str].subjects, ...subjects];
					}
				}
			});
		});

		user.assignments.forEach(assignment_id => {
			let assignment = all_assignments[assignment_id];

			let as_is_a_thing = false;
			let l_author = JSON.parse(fs.readFileSync(`users/${assignment.author}.json`));

			l_author.assignments.forEach(assignment_alt => {
				if(assignment_alt.id == assignment.id) {
					as_is_a_thing = true;
				}
			});

			if(!assignment || !as_is_a_thing) return;

			let date = assignment.selected_dates[0];
			if(!dates[date]) {
				dates[date] = {
					subjects: [],
					assignments: {}
				}
			}
			if(!dates[date].assignments[assignment.hour]) {
				dates[date].assignments[assignment.hour] = [];
			}
			dates[date].assignments[assignment.hour].push({
				assignment: assignment.assignment,
				hour: assignment.hour,
				grade: assignment.grades[user.short],
				type: assignment.type
			});
		});

		let short = "";
		let short_codes = JSON.parse(fs.readFileSync("data/short_codes.json", "utf-8"));
		Object.keys(short_codes).forEach(s => {
			if(short_codes[s] == req.body.user) {
				short = s;
			}
		});

		res.json({
			status: 200,
			data: {
				schedule: dates,
				user: {
					first_name: user.first_name,
					last_name: user.last_name,
					short: short,
					img: short,
					year: user.year
				}
			}
		});
	} else {
		res.status(404);
		res.json({
			status: 404
		});
	}
});

app.use(express.static("public"));

app.listen(1940, () => {
	console.log("Listening on port 1941");
});

function getDateStr(date) {
	// This function takes in a date object. (not string)
	// The desired return value is 01-01-1970 or DD-MM-YYYY.
	return `${(date.getDate()).toString().padStart(2, 0)}-${(date.getMonth() + 1).toString().padStart(2, 0)}-${date.getFullYear()}`
}
function getDateFromStr(str) {
	let tmp_date = str.split("-");
	let day = tmp_date[0];
	let month = tmp_date[1];
	let year = tmp_date[2];

	return new Date(`${day} ${months_eng_short[Number(month - 1)]} ${year}`);
}
let months = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
let months_eng_short = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let months_nl_short = ["Jan", "Feb", "Maa", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
let days = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
