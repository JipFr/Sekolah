const sw = true;
if (sw && navigator.onLine) {
	if ("serviceWorker" in navigator) {
		window.addEventListener("load", function() {
			navigator.serviceWorker.register("sw.js").then(function(reg) {
			}, function(err) {
				// console.log(err);
			});
		});
	}
} else if (!sw && navigator.onLine) {
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.getRegistrations().then(function(registrations) {
			for (var registration of registrations) {
				registration.unregister();
			}
		});
	}
}

function rld() {
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.getRegistrations().then(function(registrations) {
			for (var registration of registrations) {
				registration.unregister();
			}
		});
	}
	setTimeout(function() {
		location.reload(true);
	}, 200);
}

scroll();
function scroll() {
	scrollTop = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
	if(scrollTop < -120) {
		location.reload(true);
	}
	requestAnimationFrame(scroll);
}

const API = "https://api.sekolah.nl/";

if(!localStorage.getItem("user")) {
	// User is not signed in, should redirect
}

const default_parameters = {
	method: "POST",
	headers: {
		"content-type": "application/json"
	},
	body: JSON.stringify({
		user: localStorage.getItem("user")
	})
}
function f(url = "", extra = default_parameters) {
	return new Promise((resolve, reject) => {
		fetch(API + url, extra).then(data => {
			if(data.ok) {
				return data.json();
			} else {
				reject(0);
			}
		}).then(d => {
			resolve(d);
		});
	});
}

let calendar = {
	day: new Date().getDate(),
	show_month: new Date().getMonth(),
	month: new Date().getMonth(),
	year: new Date().getFullYear()
}

let data = {}

update();
function update() {
	f("get_student").then(d => {
		if(d.status == 200) {
			data = d.data;
			console.log(data);
			render();
		} else {
			console.log("User not found");
		}
	});
}

function render() {
	render_schedule_div();
}

function render_schedule_div() {
	document.querySelector(".profile_card .profile_left img").src = API + "img/" + data.user.img + ".png";
	document.querySelector(".profile_card .profile_main h3").innerHTML = data.user.first_name + " " + data.user.last_name;
	document.querySelector(".profile_card .profile_main p").innerHTML = data.user.year;
	update_calendar();
	render_schedule();
}

function update_calendar() {

	document.querySelector(".calendar_center .text").innerHTML = `${months[calendar.month]} ${calendar.year}`

	let new_date_obj = new Date(`1 ${months_eng_short[calendar.month]} ${calendar.year}`);
	let start_index = new_date_obj.getDay() % 7;
	document.querySelector(".calendar_dates").innerHTML = "";
	for(let i = 0; i < start_index; i++) {
		document.querySelector(".calendar_dates").innerHTML += `<div class="calendar_date fake_date"></div>`
	}

	let selected_date = new Date(`${calendar.day} ${months_eng_short[calendar.show_month]} ${calendar.year}`);
	let selected_date_str = getDateStr(selected_date);

	for(let i = 0; i < daysInMonth(calendar.month + 1, calendar.year); i++) {
		let current_date = new Date(`${i + 1} ${months_eng_short[calendar.month]} ${calendar.year}`);
		let current_date_str = getDateStr(current_date);

		document.querySelector(".calendar_dates").innerHTML += `
		<div class="calendar_date real_date ${data.schedule[current_date_str] && data.schedule[current_date_str].subjects.length > 0 ? "has_content" : ""} ${current_date_str == selected_date_str ? "selected_date" : ""}" onclick="set_schedule_date('${current_date_str}')">
			<span>
				${i + 1}
			</span>
		</div>`

	}
}

function render_schedule() {

	document.querySelector(".schedule_card .date").innerHTML = `${calendar.day} ${months[calendar.show_month]} ${calendar.year}`

	let div = document.querySelector(".schedule_wrapper");
	div.innerHTML = "";
	let selected_date = getDateStr(new Date(`${calendar.day} ${months_eng_short[calendar.show_month]} ${calendar.year}`));
	
	let day = data.schedule[selected_date];
	console.log(day);

	if(typeof day == "undefined" || day.subjects.length == 0) {
		div.innerHTML = `<h1 class="not_found">Niets gevonden</h1>`;
	} else {
		let new_html = "";
		let subject_index = 0;
		let new_arr = day.subjects;
		new_arr.forEach(item => {
			if(day.assignments[subject_index + 1]) {
				item.assignments = day.assignments[subject_index + 1];
				day.assignments[subject_index + 1].applied = true;
			}

			let assignments_html = "";

			if(item.assignments) {
				item.assignments.forEach(as => {
					let grade_html = "";
					if(as.grade) {
						grade_html = `
						<div class="badge_wrapper">
							<div class="badge ${Number(as.grade) < 5.5 ? "false_badge" : "" }">
								<span>${as.grade}</span>
							</div>
						</div>
						`;
					}
					assignments_html += `
						<div class="assignment">
							<div class="tag">${as.type}</div>
							<div class="assignment_content">
								${as.assignment.trim().replace(/\n/g, "<br>")}
							</div>
							${grade_html}
						</div>
					`
				});
			}

			new_html += `
			<div class="new_subject_wrapper" data-time-start="${item.time.time_start}" data-time-end="${item.time.time_end}">
				<div class="subject">
					<div class="subject_top">
						<div class="subject_hour">
							${subject_index + 1}
						</div>
						<div class="subject_content">
							<h3 class="text">${item.time.time_start} - ${item.time.time_end}</h3>
							<h2 class="text">${item.title}</h2>
						</div>
					</div>
					${assignments_html}
				</div>
				${typeof new_arr[subject_index + 1] == "undefined" ? "" : '<div class="subject_divider"></div>'}
			</div>
			`

			subject_index++

		});

		div.innerHTML = "";


		// For assignments that weren't used because of lacking subjects.
		Object.keys(day.assignments).forEach(hour => {
			let as = day.assignments[hour];
			let as_html = "";
			if(!as.applied) {
				
				console.log(as, 0);

				let grade_html = "";
				if(as.grade) {
					grade_html = `
					<div class="badge_wrapper">
						<div class="badge ${Number(as.grade) < 5.5 ? "false_badge" : "" }">
							<span>${as.grade}</span>
						</div>
					</div>
					`;
				}
				as.forEach(as_n => {
					as_html += `	
						<div class="assignment">
							<div class="tag">${as_n.type}</div>
							<div class="assignment_content">
								${as_n.assignment.trim().replace(/\n/g, "<br>")}
							</div>
							${grade_html}
						</div>
					`
				});

				div.innerHTML += `
					<div class="rogue_assignment">
						<div class="rogue_assignment_left subject_hour">
							${hour}
						</div>
						<div class="rogue_assignment_as">
							${as_html}
						</div>
					</div>
					<div class="subject_divider"></div>
				`

			}
		});

		div.innerHTML += new_html;
	}

}

function increase_month() {
	calendar.month++;
	if(calendar.month > 11) {
		calendar.month = 0;
		calendar.year++
	}
	update_calendar();
}
function decrease_month() {
	calendar.month--;
	if(calendar.month < 0) {
		calendar.month = 11;
		calendar.year--
	}
	update_calendar();
}

function set_schedule_date(str) {
	let date = getDateFromStr(str);
	calendar.day = date.getDate();
	calendar.show_month = date.getMonth();
	calendar.year = date.getFullYear();
	render();
}

function daysInMonth(month = new Date().getMonth(), year = new Date().getFullYear()) {
	return new Date(year, month, 0).getDate();
}


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
