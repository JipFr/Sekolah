let can_save = false;
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

if(localStorage.getItem("menu_state") == "true") {
	toggleMenu(false);
}

function toggleMenu(toggle = true) {
	// `toggle` is wether it should update. If toggle is false it will only update it... Or something
	if(toggle) localStorage.setItem("menu_state", !eval(localStorage.getItem("menu_state")));
	document.querySelector(".bodyDiv").classList.toggle("bigger");
	document.querySelector(".navWrapper").classList.toggle("smaller");
	document.querySelector(".nav").classList.toggle("smaller");
	document.querySelector("body").classList.toggle("nav-small");
}

// Return days in month (duh)
function daysInMonth(month = new Date().getMonth(), year = new Date().getFullYear()) {
	return new Date(year, month, 0).getDate();
}
let empty_day = {
	subjects: [],
	activated: []
}
let title_max_length = 24;
let times_is_down = false;
let current_schedule;
let schedules = [];
let assignments = [];
let students = [];
let current_edit = {
	day: 0,
	month: new Date().getMonth(),
	year: new Date().getFullYear(),
	data: {
		
	},
	type: "schedule",
	max_dates: Infinity // Int
}

const arr_empty = `
	<div class="not_found">
		<h3 class="small_heading">Niets gevonden.</h3>
	</div>
`

const calendar_inner_default = `
<div class="calendar_div universal_padding">
	<div class="calendar_month">
		<div class="calendar_month_left calendar_month_navigation" onclick="previous_month();">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-left"><polyline points="15 18 9 12 15 6"></polyline></svg>
		</div>
		<div class="calendar_month_main">
			<span>...</span>
		</div>
		<div class="calendar_month_right calendar_month_navigation" onclick="next_month();">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right"><polyline points="9 18 15 12 9 6"></polyline></svg>
		</div>
	</div>
	<div class="calendar_days">
		<div class="calendar_day">zon</div>
		<div class="calendar_day">maa</div>
		<div class="calendar_day">din</div>
		<div class="calendar_day">woe</div>
		<div class="calendar_day">don</div>
		<div class="calendar_day">vri</div>
		<div class="calendar_day">zat</div>
	</div>
	<div class="calendar_dates">
			
	</div>
</div>
`
let months = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
let months_eng_short = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let months_nl_short = ["Jan", "Feb", "Maa", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
let days = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

function previous_month() {
	current_edit.month--
	if(current_edit.month <= -1) {
		current_edit.month = 11;
		current_edit.year--;
	}
	update_calendar();
}
function next_month() {
	current_edit.month++
	if(current_edit.month >= 12) {
		current_edit.month = 0;
		current_edit.year++;
	}
	update_calendar();
}

update_calendar();
function update_calendar(div = document.querySelector(".calendar_div")) {
	if(div) {

		let new_date_str = `${months[current_edit.month]} ${current_edit.year}`;
		div.querySelector(".calendar_month_main span").innerHTML = new_date_str;

		let dates_div = div.querySelector(".calendar_dates");
		dates_div.innerHTML = "";

		let new_date_obj = new Date(`1 ${months_eng_short[current_edit.month]} ${current_edit.year}`);
		let start_index = new_date_obj.getDay() % 7;
		let start_day = days[start_index];

		// Make sure that there's a few empty blocks to get the days to align
		for(let i = 0; i < start_index; i++) {
			dates_div.innerHTML += `<div class="calendar_date fake_date"></div>`
		}

		let days_in_month = daysInMonth(current_edit.month + 1, current_edit.year);
		let local_days_copy = Object.assign([], current_edit.data.selected_dates);
		let days_occupied = [];
		since_last_row = 0;

		recalculate_days();
		recalculate_schedule();

		let set_dates = {}
		Object.keys(current_edit.data.streak_starts).forEach(date => {
			let start_date = getDateFromStr(date);
			for(let i = 0; i < current_edit.data.streak_starts[date]; i++) {
				let days = current_edit.data.days;
				let new_date = new Date(start_date.getTime() + 1000 * 60 * 60 * 24 * i);
				if(days && !(days && days[i] && days[i].subjects.length > 0)) {
					set_dates[getDateStr(new_date)] = "no_content";
				} else {
					set_dates[getDateStr(new_date)] = "";
				}
			}
		});

		for(let i = 0; i < days_in_month; i++) {
			let extra = "";
			let extra_content = "";

			let current_date = new Date(`${i + 1} ${months_eng_short[current_edit.month]} ${current_edit.year}`);
			let formatted_str = getDateStr(current_date);

			let line_extra = "";
			let day_after_str = getDateStr(new Date(current_date.getTime() + 1000 * 60 * 60 * 24));

			if(current_edit.data.selected_dates.includes(formatted_str)) {
				extra = "selected_date";
				if(set_dates[day_after_str] == "") {
					line_extra = "next_has_content";
				}
				if(typeof set_dates[day_after_str] !== "undefined") {
					extra_content = `<div class="calendar_line ${line_extra}"></div>`
				}
			}
			
			if(set_dates[formatted_str] && set_dates[formatted_str].length > 0) {
				extra += " " + set_dates[formatted_str];
			}

			let extra_2 = "";
			
			if(current_edit.data.streak_starts[formatted_str]) {
				extra_2 += "calendar_streak_start";
			}

			if(typeof set_dates[day_after_str] == "undefined") {
				extra_2 += " calendar_streak_end"
			}	

			let today_str = getDateStr(new Date());
			if(formatted_str == today_str) {
				extra_2 += " calendar_is_today";
			}

			dates_div.innerHTML += `<div class="calendar_date real_date ${extra} ${extra_2}" onclick="toggle_date_active('${formatted_str}', has_shift_down);"><span>${i + 1}</span> ${extra_content}</div>`
		}
	}
}


function getDateStr(date) {
	// This function takes in a date object. (not string)
	// The desired return value is 01-01-1970 or DD-MM-YYYY.
	return `${(date.getDate()).toString().padStart(2, 0)}-${(date.getMonth() + 1).toString().padStart(2, 0)}-${date.getFullYear()}`
}

let last_toggled = false;
function toggle_date_active(date_arr, multiple = false) {
	let dates = current_edit.data.selected_dates;
	let original = date_arr;

	if(typeof date_arr == "string") {
		date_arr = [date_arr];
	}

	if(multiple && last_toggled) {
		let date0 = getDateFromStr(original);
		let date1 = getDateFromStr(last_toggled);
		let start_date;
		let end_date;
		if(date0.getTime() < date1.getTime()) {
			start_date = date0;
			end_date = date1;
		} else {
			start_date = date1;
			end_date = new Date(date0.getTime() + 1000 * 60 * 60 * 24);
		}
		let difference = end_date.getTime() - start_date.getTime();
		difference = Math.floor(difference  / (1000 * 60 * 60 * 24));
		date_arr = [];
		let handle_date = start_date;
		for(let i = 0; i < difference; i++) {
			date_arr.push(getDateStr(handle_date));
			handle_date = new Date(handle_date.getTime() + (1000 * 60 * 60 * 24));
		}
	}

	date_arr.forEach(date_str => {
		if(dates.includes(date_str) && !multiple) {
			dates.splice(dates.indexOf(date_str), 1);
			// Remove said date from all activated things.
			if(current_edit.data.days) {
				current_edit.data.days.forEach(day => {
					while(day.activated.includes(date_str)) {
						day.activated.splice(day.activated.indexOf(date_str), 1);
					}
				});
			}
		} else {
			dates.push(date_str);
		}
		if(dates.length > current_edit.max_dates) {
			dates.splice(0, 1);
		}
	});

	let new_arr = [];
	current_edit.data.selected_dates.forEach(date => {
		if(!new_arr.includes(date)) {
			new_arr.push(date);
		}
	});
	current_edit.data.selected_dates = new_arr;

	locally_saved();
	save();
	update_calendar();
	load_both();
	last_toggled = original + "";
}

function load_both() {
	schedule_load_all();
	assignment_load_all();
}

function recalculate_days() {
	if(current_edit.data && current_edit.data.days) {
		current_edit.data.days.forEach(day => {
			days.activated = [];
		});
	}

	let last_applicable_day = "";
	let last_start = "";
	let streak = 1;

	let dates = current_edit.data.selected_dates;
	if(current_edit.data.days) {
		let days = current_edit.data.days;
	}

	current_edit.data.streak_starts = {}

	dates = dates.sort((a, b) => {
		return getDateFromStr(a).getTime() - getDateFromStr(b).getTime();
	});

	dates.forEach(date => {

		tmp_date = getDateFromStr(date);

		let day_after_this = getDateStr(new Date(tmp_date.getTime() + 1000 * 60 * 60 * 24));
		let day_before_this = getDateStr(new Date(tmp_date.getTime() - 1000 * 60 * 60 * 24));

		if(streak == 1) {
			last_start = date;
		}

		if(dates.includes(day_after_this)) {
			streak++
		} else {
			if(streak > 0) {
				current_edit.data.streak_starts[last_start] = streak;
			}
			streak = 1;
		}

	});

}

function getDateFromStr(str) {
	let tmp_date = str.split("-");
	let day = tmp_date[0];
	let month = tmp_date[1];
	let year = tmp_date[2];

	return new Date(`${day} ${months_eng_short[Number(month - 1)]} ${year}`);
}

let has_shift_down = false;
document.addEventListener("keydown", evt => {
	if(evt.key == "Shift") has_shift_down = true;
});
document.addEventListener("keyup", evt => {
	if(evt.key == "Shift") has_shift_down = false;
});

scroll();
function scroll() {
	scrollTop = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
	if(scrollTop < -120) {
		rld();
	}
	requestAnimationFrame(scroll);
}

function genID() {
	let str = "";
	let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	possible += possible.toLowerCase();
	possible += "0987654321";
	for(let i = 0; i < 40; i++) {
		str += possible[Math.floor(Math.random() * possible.length)];
	}
	return str;
}

function load_schedules() {
	let new_html = "";
	schedules.forEach(sched => {
		let extra = "";

		let img_html = "";
		if(!sched.students) sched.students = [];
		for(let i = 0; i < 3; i++) {
			if(sched.students[i]) {
				img_html += `<img alt="Profile picture" class="profile_pic" src="${API}img/${get_student_image(sched.students[i])}.png" onerror="this.src = '${API}img/default_user.png'">`
			}
		}

		let n_title = sched.title;
		if(n_title.length > title_max_length) {
			n_title = n_title.slice(0, title_max_length).trim() + "...";
		}

		if(typeof current_edit !== "undefined" && current_edit.data && current_edit.data.id && current_edit.data.id == sched.id) {
			extra = "focus_item_small";
		}
		new_html +=`<div class="item_small ${sched.last_saved == 0 || sched.last_saved < sched.local_save ? "" : "is_saved_h4"} universal_padding sidebar_schedule ${extra}" data-schedule-id="${sched.id}">
						<div class="item_small_main" onclick="load_schedule('${sched.id}')">
							<h3 class="small_heading">${n_title}</h3>
							<div class="item_small_lower">
								<h4>
									<div class="last_saved">${sched.last_saved == 0 || sched.last_saved < sched.local_save ? "<span class='red'>Niet opgeslagen</span>" : saved_at(sched.last_saved)} </div>
									${sched.students.length > 0 ? '<span class="lower_dot">•</span>' : ''}
									<div class="relevant_people">
										${img_html}
									</div>
								</h4>
							</div>
						</div>
						<div class="details_div full_height">
							<details>
								<summary>
									<svg xmlns="http://www.w3.org/2000/svg" width="4" height="24" viewBox="0 0 4 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-more-vertical"><circle cx="2" cy="12" r="1"></circle><circle cx="2" cy="5" r="1"></circle><circle cx="2" cy="19" r="1"></circle></svg>
								</summary>

								<div class="dropdown">
									<ul>
										<li class="hover_opacity">
											<span class="li_content">
												<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-info"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="8"></line></svg>
												<span>Opties</span>
											</span>
										</li>
										<div class="ul_main">
											<li onclick="delete_schedule('${sched.id}')" class="hover_opacity">
												<span class="li_content">
													<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
													<span>Verwijder</span>
												</span>
											</li>
											<li onclick="clone_schedule('${sched.id}')" class="hover_opacity">
												<span class="li_content">
													<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
													<span>Kopieer</span>
												</span>
											</li>
										</div>
									</ul>
								</div>
							</details>
						</div>
					</div>`
	});
	if(schedules.length > 0) {
		document.querySelector(".container.schedules .item_small_list").innerHTML = new_html;
	} else {
		document.querySelector(".container.schedules .item_small_list").innerHTML = arr_empty;
	}
}
function load_assignments() {
	let new_html = "";
	assignments.forEach(as => {
		let extra = "";

		let img_html = "";
		if(!as.students) as.students = [];
		for(let i = 0; i < 3; i++) {
			if(as.students[i]) {
				img_html += `<img alt="Profile picture" class="profile_pic" src="${API}img/${get_student_image(as.students[i])}.png" onerror="this.src = '${API}img/default_user.png'">`
			}
		}

		if(typeof current_edit !== "undefined" && current_edit.data && current_edit.data.id && current_edit.data.id == as.id) {
			extra = "focus_item_small";
		}

		let n_title = as.assignment;
		if(n_title.length > title_max_length) {
			n_title = n_title.slice(0, title_max_length).trim() + "...";
		}

		let badge_class = "";
		if(as.type == "pw") {
			badge_class = "badge_not_selected";
		} else if(as.type == "hw") {
			badge_class = "badge_selected";
		} else {
			badge_class = "badge_unknown";
		}

		new_html +=`<div class="item_small ${as.last_saved == 0 || as.last_saved < as.local_save ? "" : "is_saved_h4"} universal_padding sidebar_assignment ${extra}" data-assignment-id="${as.id}">
						<div class="item_small_main" onclick="load_assignment('${as.id}')">
							<h3 class="small_heading">${n_title}</h3>
							<div class="item_small_lower">
								<h4>
									<div class="last_saved">${as.last_saved == 0 || as.last_saved < as.local_save ? "<span class='red'>Niet opgeslagen</span>" : saved_at(as.last_saved)} </div>
									${as.students.length > 0 ? '<span class="lower_dot">•</span>' : ''}
									<div class="relevant_people">
										 ${img_html}
									</div>
									<span class="lower_dot">•</span>
									<div class="assignment_small_type"><div class="badge_smallest ${badge_class}">${as.type}</div></div>
								</h4>
							</div>
						</div>
						<div class="details_div full_height">
							<details>
								<summary>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-more-vertical"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
								</summary>

								<div class="dropdown">
									<ul>
										<li class="hover_opacity">
											<span class="li_content">
												<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-info"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="8"></line></svg>
												<span>Opties</span>
											</span>
										</li>
										<div class="ul_main">
											<li onclick="delete_assignment('${as.id}')" class="hover_opacity">
												<span class="li_content">
													<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
													<span>Verwijder</span>
												</span>
											</li>
											<li onclick="clone_assignment('${as.id}')" class="hover_opacity">
												<span class="li_content">
													<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
													<span>Kopieer</span>
												</span>
											</li>
										</div>
									</ul>
								</div>
							</details>
						</div>
					</div>`
	});
	if(assignments.length > 0) {
		document.querySelector(".container.assignments .item_small_list").innerHTML = new_html;
	} else {
		document.querySelector(".container.assignments .item_small_list").innerHTML = arr_empty;
	}
}

// Takes in either string or object. If string it's an ID which will be converted to the relevant object
function load_schedule(schedule, reset_values = true) {
	document.querySelector(".assignments .assignment_edit_wrapper").innerHTML = "";
	document.querySelector(".assignments .right_side_wrapper").innerHTML = "";
	current_edit.max_dates = Infinity;
	// Assign to relevant schedule object if it's an ID
	if(typeof schedule == "string") {
		schedules.forEach(item => {
			if(item.id == schedule) {
				schedule = item;
			}
		});
		if(typeof schedule == "string") {
			return 404;
		}
	}
	if(!schedule.days) return 500;
	current_schedule = schedule;
	current_edit.data = schedule;

	document.querySelectorAll(".focus_item_small").forEach(item => {
		item.classList.remove("focus_item_small");
	})
	document.querySelector(`.sidebar_schedule[data-schedule-id="${schedule.id}"]`).classList.add("focus_item_small")

	// Reset base values 
	if(reset_values) {
		current_edit.day = 0;
	}

	// Setting the calendar and getting the editor HTML
	document.querySelector(".schedule_edit_wrapper").innerHTML = get_schedule_editor_html(schedule);
	document.querySelector(".right_side_wrapper").innerHTML = `
		${calendar_inner_default}
		${get_student_selector_html()}
	`;
	update_calendar();

	console.log(schedule);
	save();
}
function load_assignment(assignment, reset_values = true) {
	document.querySelector(".schedules .schedule_edit_wrapper").innerHTML = "";
	document.querySelector(".schedules .right_side_wrapper").innerHTML = "";
	current_edit.max_dates = 1;
	// Assign to relevant assignment object if it's an ID
	if(typeof assignment == "string") {
		assignments.forEach(item => {
			if(item.id == assignment) {
				assignment = item;
			}
		});
		if(typeof assignment == "string") {
			return 404;
		}
	}
	current_assignment = assignment;
	current_edit.data = assignment;

	document.querySelectorAll(".sidebar_assignment.focus_item_small").forEach(item => {
		item.classList.remove("focus_item_small");
	})
	document.querySelector(`.sidebar_assignment[data-assignment-id="${assignment.id}"]`).classList.add("focus_item_small")

	// Reset base values
	if(reset_values) {
		current_edit.day = 0;
	}

	// Setting the calendar and getting the editor HTML
	document.querySelector(".assignment_edit_wrapper").innerHTML = get_assignment_editor_html(assignment);

	document.querySelector(".assignment_assignment").addEventListener("keyup", evt => {
		console.log(evt);
		if(evt.key == "Enter" && evt.ctrlKey) {
			evt.target.blur();
			new_assignment_value(evt.target.value);
		}
	});
	document.querySelector(".assignment_assignment").addEventListener("blur", evt => {
		console.log(evt);
		new_assignment_value(evt.target.value);
	});

	document.querySelector(".container.assignments .right_side_wrapper").innerHTML = `
		${calendar_inner_default}
		${get_student_selector_html()}
	`;
	update_calendar();

	save();
}

function saved_at(date) {
	let d = new Date();
	let day = d.getDate();
	let month = months[d.getMonth()];
	// let year = d.getFullYear();

	//  
	return `<span>Opgeslagen:</span><strong>${day} ${month.slice(0, 3).toLowerCase()}. ${typeof year !== "undefined" ? year : ""} ${d.getHours().toString().padStart(2, 0)}:${d.getMinutes().toString().padStart(2, 0)}</strong>`;
}

function get_schedule_editor_html(schedule) {

	// Days div. The top part where you select what day you want to edit.
	let days_div = "";
	
	let max = schedule.days.length;
	if(max == 0) {
		max = 1;
	}
	
	for(let i = 0; i < max; i++) {
		days_div += `
		<div class="schedule_day ${current_edit.day == i ? "focus_day" : ""} spread_2" data-schedule-day="${i + 1}">
			<span onclick="set_edit_day(${i})">Dag ${i + 1}</span>
			<details>
				<summary>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-more-vertical"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
				</summary>

				<div class="dropdown">
					<ul>
						<li class="hover_opacity">
							<span class="li_content">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-info"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="8"></line></svg>
								<span>Dag ${i + 1}</span>
							</span>
						</li>
						<div class="ul_main">
							<li onclick="delete_day(${i})" class="hover_opacity">
								<span class="li_content">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
									<span>Verwijder</span>
								</span>
							</li>
							<li class="hover_opacity" onclick="add_new_day(${i})">
								<span class="li_content">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-corner-down-left"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
									<span>Nieuw voor</span>
								</span>
							</li>
							<li class="hover_opacity" onclick="add_new_day(${i + 1})">
								<span class="li_content">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-corner-down-right"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>
									<span>Nieuw na</span>
								</span>
							</li>
							<li class="hover_opacity" onclick="clone_day(${i}, ${i})">
								<span class="li_content">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
									<span>Kopieer</span>
								</span>
							</li>
						</div>
					</ul>
				</div>
			</details>
		</div>
		`
	}
	
	days_div += `
	<div class="schedule_day secondary_day" onclick="add_new_day()">
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-plus"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
	</div>`

	return `
	<div class="schedule_info universal_padding">
		<h3 class="small_heading underline" onclick="change_schedule_bit(this, 'title')" data-text="${schedule.title}">${schedule.title}</h3>
		<p onclick="change_schedule_bit(this, 'description')" data-text="${schedule.description}">${schedule.description}</p>
	</div>
	<div class="schedule_times_wrapper universal_padding ${times_is_down ? "" : "hide_special"}">
		<h3 class="small_heading spread">
			<span>Standaard tijden</span>
			<svg onclick="toggle_times_is_down();" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--main)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="rotate_on_hide feather feather-chevron-up"><polyline points="18 15 12 9 6 15"></polyline></svg>
		</h3>
		<div class="schedule_times to_hide">
			${get_times_html(schedule)}
		</div>
	</div>
	<div class="edit_schedule universal_padding">
		<div class="schedule_top schedule_days">
			${days_div}
		</div>
		<div class="subjects_div">
			${get_subjects_html(schedule)}
		</div>
	</div>`;
}
function get_assignment_editor_html(assignment) {
	return `
	<div class="schedule_info universal_padding">
		<h3 class="small_heading" data-text="${assignment.assignment}">${assignment.assignment}</h3>
	</div>
	<div class="edit_assignment universal_padding">
		<div class="assignment_inputs">
			<div class="assignment_input_0 assignment_input">
				<h3 class="small_heading">Opdracht</h3>
				<textarea class="assignment_assignment" placeholder='Vul hier de opdracht in. Bv. "Maak opdracht 15"'>${assignment.assignment}</textarea>
			</div>
			<div class="assignment_input_1 assignment_input_numeric assignment_input">
				<h3 class="small_heading">Lesuur</h3>
				<div class="hour_cards">
					<div class="hour_card hover_opacity ${assignment.hour == 1 ? "hour_selected" : ""}" onclick="set_assignment_hour(1)">
						1
					</div>
					<div class="hour_card hover_opacity ${assignment.hour == 2 ? "hour_selected" : ""}" onclick="set_assignment_hour(2)">
						2
					</div>
					<div class="hour_card hover_opacity ${assignment.hour == 3 ? "hour_selected" : ""}" onclick="set_assignment_hour(3)">
						3
					</div>
					<div class="hour_card hover_opacity ${assignment.hour == 4 ? "hour_selected" : ""}" onclick="set_assignment_hour(4)">
						4
					</div>
					<div class="hour_card hover_opacity ${assignment.hour == 5 ? "hour_selected" : ""}" onclick="set_assignment_hour(5)">
						5
					</div>
					<div class="hour_card hover_opacity ${assignment.hour == 6 ? "hour_selected" : ""}" onclick="set_assignment_hour(6)">
						6
					</div>
					<div class="hour_card hover_opacity ${assignment.hour == 7 ? "hour_selected" : ""}" onclick="set_assignment_hour(7)">
						7
					</div>
					<div class="hour_card hover_opacity ${assignment.hour == 8 ? "hour_selected" : ""}" onclick="set_assignment_hour(8)">
						8
					</div>
				</div>
			</div>
			<div class="assignment_input_1 assignment_input_numeric assignment_input">
				<h3 class="small_heading">Type opdracht</h3>
				<div class="assignment_types_div">
					<div class="assignment_type ${assignment.type == "hw" ? "type_selected" : ""}" onclick="set_assignment_type('hw')">
						<h2 class="spread">
							<span>Huiswerk</span>
							<div class="badge_small badge_selected">HW</div>
						</h2>
						<p>Huiswerk verschijnt voor leerlingen als "HW". Dit is bedoelt voor werk dat in vrije tijd gemaakt moet worden.</p>
					</div>
					<div class="assignment_type ${assignment.type == "pw" ? "type_selected" : ""}" onclick="set_assignment_type('pw')">
						<h2 class="spread">
							<span>Toets</span>
							<div class="badge_small badge_selected">PW</div>
						</h2>
						<p>Een toets verschijnt voor leerlingen als "PW". Dit is bedoelt voor toetsen, examens / oefen-examens, etc.</p>
					</div>
					<div class="assignment_type ${assignment.type == "op" ? "type_selected" : ""}" onclick="set_assignment_type('op')">
						<h2 class="spread">
							<span>Opdracht</span>
							<div class="badge_small badge_selected">OP</div>
						</h2>
						<p>Een opdracht verschijnt voor leerlingen als "OP". Dit is bedoelt voor werk dat tijdens de les gemaakt moet worden.</p>
					</div>
				</div>
			</div>
			${get_assignment_student_grade_html(assignment)}
			
		</div>
	</div>`;
}
function get_subjects_html(schedule) {
	// This'll return what shows UNDER the "day 1" - "day X" part.
	// As the name describes, that's the actual subjects.
	let new_html = "";

	let day = schedule.days[current_edit.day];
	let subjects;
	if(day && day.subjects) {
		subjects = day.subjects;
	}

	if( typeof subjects == "undefined" || subjects.length == 0) {
		// Empty state
		new_html = `
			<div class="no_subjects">
				<h1 class="title">¯\\_(ツ)_/¯</h1>
				<h3 class="title">Geen vakken gevonden</h3>
				<div class="button_div">
					<button class="primary_button button" onclick="create_new_subject(0)">
						Nieuw vak toevoegen
					</button>
				</div>
			</div>
		`
	} else {
		let subject_index = 0;
		subjects.forEach(subject => {
			let time_start = "??:??";
			let time_end = "??:??";
			if(schedule.times[subject_index]) {
				if(schedule.times[subject_index].time_start) {
					time_start = schedule.times[subject_index].time_start;
				}
				if(schedule.times[subject_index].time_end) {
					time_end = schedule.times[subject_index].time_end;
				}
			}
			new_html += `
				<div class="edit_subject" data-subject-index="${subject_index}" data-time-start="${time_start}" data-time-end="${time_end}">
					<div class="edit_subject_main">
						<h4 class="small_heading subject_main_title">
							<span class="secondary time_span">${time_start} - ${time_end}</span>
							•
							<span class="secondary room_span">${subject.room || 0}</span>
						</h4>
						<h2 onclick="change_subject_title(${subject_index}, this)"><span>${subject.title}</span></h2>
					</div>
					<div class="edit_subject_actions">
						<button class="secondary_button button" onclick="create_new_subject(${subject_index})">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-corner-left-up"><polyline points="14 9 9 4 4 9"></polyline><path d="M20 20h-7a4 4 0 0 1-4-4V4"></path></svg>
							<span>Nieuw lesuur hiervoor</span>
						</button>
						<button class="secondary_button button" onclick="delete_subject(${subject_index})">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
							<span>Verwijderen</span>
						</button>
						<button class="secondary_button button" onclick="create_new_subject(${subject_index + 1})">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-corner-left-down"><polyline points="14 15 9 20 4 15"></polyline><path d="M20 4h-7a4 4 0 0 0-4 4v12"></path></svg>
							<span>Nieuw lesuur hierna</span>
						</button>
						<button class="secondary_button button" onclick="clone_subject(${subject_index})">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
							<span>Kopieren</span>
						</button>
					</div>
				</div>
			`
			subject_index++
		});
	}

	return new_html;
}

function set_edit_day(day) {
	current_edit.day = day;
	load_schedule(current_schedule, false);
}

function change_schedule_bit(element_to_replace, type = "title") {
	console.log(element_to_replace);
	element_to_replace.outerHTML = `
	<div class="small_card_wrapper">
		<div class="small_card">
			<p>Nieuwe ${type == "title" ? "titel" : "omschrijving"}</p>
			<input class="new_title" placeholder="${element_to_replace.getAttribute("data-text")}" onchange="change_schedule_${type}_post(this.value)" value="${element_to_replace.getAttribute("data-text")}">
		</div>
	</div>
	`
	document.querySelector(".new_title").focus();
}

function change_schedule_title_post(new_title) {
	if(new_title.trim().length == 0) return;
	current_edit.data.title = new_title;
	locally_saved();
	load_schedules();
	load_schedule(current_edit.data.id);
}
function change_schedule_description_post(new_description) {
	if(new_description.trim().length == 0) return;
	current_edit.data.description = new_description;
	locally_saved();
	load_schedules();
	load_schedule(current_edit.data.id);
}

function locally_saved() {
	clean_values();
	current_edit.data.local_save = new Date().getTime();
}

function get_times_html(schedule) {
	let new_html = "";

	if(!schedule.times || schedule.times.length == 0) {
		schedule.times = [
			{
				time_start: "00:00",
				time_end: "01:00"
			},
			{
				time_start: "01:00",
				time_end: "02:00"
			},
			{
				time_start: "02:00",
				time_end: "03:00"
			},
			{
				time_start: "03:00",
				time_end: "04:00"
			},
			{
				time_start: "05:00",
				time_end: "06:00"
			},
			{
				time_start: "06:00",
				time_end: "07:00"
			},
			{
				time_start: "07:00",
				time_end: "08:00"
			},
			{
				time_start: "08:00",
				time_end: "09:00"
			}
		]
	}

	let time_index = 0;
	schedule.times.forEach(time => {
		new_html += `
			<div class="time_div">
				<p>Lesuur ${time_index + 1}</p>
				<div class="time_div_lower">
					<div class="time_div_lower_start">
						<p>Van</p><input onblur='new_time(${time_index}, this.value, "start");' class="start_time" data-time-hour="${time_index}" value="${time.time_start}" type="time">
					</div>
					<div class="time_div_lower_end">
						<p>Tot</p><input onblur='new_time(${time_index}, this.value, "end");' class="end_time" data-time-hour="${time_index}" value="${time.time_end}" type="time">
					</div>
				</div>
			</div>
		`
		time_index++
	});

	return new_html;
}

function toggle_times_is_down() {
	times_is_down = !times_is_down;
	if(times_is_down) {
		document.querySelector('.schedule_times_wrapper').classList.remove('hide_special');
	} else {
		document.querySelector('.schedule_times_wrapper').classList.add('hide_special');
	}
}

function new_time(hour, time, start_end = "start") {
	// Time is what period. Goes from 0-7 (just about)
	// Time is **:** (in 24 hour clock)
	// start_end is a string, wether it's the start time or the end time
	if(current_edit.data.times[hour]) {
		if(start_end == "start") {
			current_edit.data.times[hour].time_start = time;
		} else if(start_end == "end") {
			current_edit.data.times[hour].time_end = time;
		}
		locally_saved();
		load_schedule(current_edit.data.id, false);
		return 200;
	} else {
		// Might make this automatically fix it later
		return 404;
	}
}

function create_new_subject(index) {
	check_day();
	let subjects = current_edit.data.days[current_edit.day].subjects;
	let new_arr = [];

	console.log(subjects);

	let new_obj = {
		title: "Voeg hier de titel in",
		teacher: "Kabouter Plop"
	};


	if(index == subjects.length) {
		new_arr = [...subjects, new_obj];
	} else if(subjects.length > 0) {
		for(let i = 0; i < subjects.length; i++) {
			if(i == index) {
				new_arr.push(new_obj);
			}
			new_arr.push(subjects[i]);
		}
	} else {
		new_arr = [new_obj];
	}

	current_edit.data.days[current_edit.day].subjects = new_arr;

	locally_saved();
	schedule_load_all();
}

function delete_subject(index) {
	check_day();
	let subjects = current_edit.data.days[current_edit.day].subjects;
	let new_arr = [];
	
	for(let i = 0; i < subjects.length; i++) {
		if(i !== index) {
			new_arr.push(subjects[i]);
		}
	}

	current_edit.data.days[current_edit.day].subjects = new_arr;

	locally_saved();
	schedule_load_all();
}
function clone_subject(index) {
	check_day();
	let subjects = current_edit.data.days[current_edit.day].subjects;
	let new_arr = [];
	
	for(let i = 0; i < subjects.length; i++) {
		if(i == index) {
			new_arr.push(Object.assign({}, subjects[i]));
		}
		new_arr.push(subjects[i]);
	}

	current_edit.data.days[current_edit.day].subjects = new_arr;

	locally_saved();
	schedule_load_all();
}


function add_new_day(index = current_edit.data.days.length) {
	// current_edit.day = current_edit.data.days.length;
	check_day();

	let days = current_edit.data.days;
	let new_arr = [];
	let has_added = false;

	for(let i = 0; i < days.length; i++) {
		if(i == index) {
			new_arr.push(Object.assign({}, empty_day));
			has_added = true;
		}
		new_arr.push(days[i]);
	}

	if(!has_added) {
		new_arr.push(Object.assign({}, empty_day));
		has_added = true;
	}

	current_edit.data.days = new_arr;

	locally_saved();
	schedule_load_all();
}
function delete_day(index) {
	let days = current_edit.data.days;
	let new_arr = [];
	
	for(let i = 0; i < days.length; i++) {
		if(i !== index) {
			new_arr.push(days[i]);
		}
	}

	current_edit.data.days = new_arr;

	schedule_load_all();
	locally_saved();
}

function check_day() {
	if(!current_edit.data.days[current_edit.day]) {
		current_edit.data.days[current_edit.day] = Object.assign({}, empty_day);
		locally_saved();
	}
}

function recalculate_schedule() {
	if(current_edit.data && current_edit.data.days) {
		current_edit.data.days.forEach(day => {
			if(!day.subjects) day.subjects = [];
		});
	}
}

function clone_schedule(schedule) {
	if(typeof schedule == "string") {
		schedules.forEach(item => {
			if(item.id == schedule) {
				schedule = item;
			}
		});
		if(typeof schedule == "string") {
			return 404;
		}
	}
	if(!schedule.id) return 500;
	let new_schedule = JSON.parse(JSON.stringify(schedule));
	new_schedule.made_at = new Date().getTime();
	new_schedule.id = genID();
	// schedule.title += "(1)";
	let tmp_counter = 1;

	while(JSON.stringify(schedules).includes(new_schedule.title + " - (" + tmp_counter + ")")) {
		tmp_counter++
	}

	new_schedule.title += " - (" + tmp_counter + ")";
	new_schedule.last_saved = 0;
	new_schedule.local_save = new_schedule.last_saved;

	schedules.unshift(new_schedule);

	locally_saved();
	schedule_load_all();
}
function new_schedule() {

	let new_schedule = {
		title: `${new Date().getDate()} ${months[new Date().getMonth()]} ${new Date().getFullYear()} ${new Date().getHours().toString().padStart(2, 0)}:${new Date().getMinutes().toString().padStart(2, 0)}:${new Date().getSeconds().toString().padStart(2, 0)}`,
		description: "Een nieuw rooster.",
		selected_dates: [],
		days: [],
		id: genID(),
		students: [],
		last_saved: 0,
		local_save: 0,
		made_at: new Date().getTime()
	}

	schedules.unshift(new_schedule);

	save();
	schedule_load_all();
}
function new_assignment() {

	let new_assignment = {
		"assignment": `Nieuwe opdracht van ${new Date().getDate()} ${months[new Date().getMonth()]} ${new Date().getFullYear()} ${new Date().getHours().toString().padStart(2, 0)}:${new Date().getMinutes().toString().padStart(2, 0)}:${new Date().getSeconds().toString().padStart(2, 0)}`,
		"hour": 0,
		"type": "op",
		"students": [],
		"id": genID(),
		"selected_dates": [],
		"last_saved": new Date().getTime(),
		"local_save": new Date().getTime() + 1000
	}

	assignments.unshift(new_assignment);

	save();
	assignment_load_all();
}
function delete_schedule(schedule) {
	if(typeof schedule == "string") {
		schedules.forEach(item => {
			if(item.id == schedule) {
				schedule = item;
			}
		});
		if(typeof schedule == "string") {
			return 404;
		}
	}
	if(!schedule.id) return 500;
	let new_schedule = Object.assign({}, schedule);

	if(confirm("Verwijder rooster '" + schedule.title + "'?")) {
		for(let i = 0; i < schedules.length; i++) {
			if(schedules[i].id == new_schedule.id) {
				schedules.splice(i, 1);
			}
		}

		if(current_edit.data && current_edit.data.id && schedule.id == current_edit.data.id) {
			current_edit.data = {}
			document.querySelector(".schedule_edit_wrapper").innerHTML = "";
			document.querySelector(".right_side_wrapper").innerHTML = "";
		}

		save();
		schedule_load_all();
	}
}
function delete_assignment(assignment) {
	if(typeof assignment == "string") {
		assignments.forEach(item => {
			if(item.id == assignment) {
				assignment = item;
			}
		});
		if(typeof assignment == "string") {
			return 404;
		}
	}
	if(!assignment.id) return 500;
	let new_assignment = Object.assign({}, assignment);

	if(confirm("Verwijder opdracht '" + assignment.assignment + "'?")) {
		for(let i = 0; i < assignments.length; i++) {
			if(assignments[i].id == new_assignment.id) {
				assignments.splice(i, 1);
			}
		}

		if(current_edit.data && current_edit.data.id && assignment.id == current_edit.data.id) {
			current_edit.data = {}
			document.querySelector(".assignment_edit_wrapper").innerHTML = "";
			document.querySelector(".assignments .right_side_wrapper").innerHTML = "";
		}

		save();
		load_both();
	}
}

function schedule_load_all() {
	if(localStorage.getItem("tab") == "schedules") {
		load_schedules();
		if(current_edit.data && current_edit.data.id) {
			load_schedule(current_edit.data.id, false);
		}
	}
}
function assignment_load_all() {
	if(localStorage.getItem("tab") == "assignments") {
		load_assignments();
		if(current_edit.data && current_edit.data.id) {
			load_assignment(current_edit.data.id, false);
		}
	}
}

function change_subject_title(subject_index, element) {

	let new_index = subject_index;
	let should_update = true;

	element.outerHTML = `
		<input class="title_input h2_input" value="${element.querySelector('span').innerHTML}">
	`
	document.querySelector(".h2_input").focus();
	document.querySelector(".h2_input").addEventListener("blur", evt => {
		if(should_update) {
			console.log("Edited");
			current_edit.data.days[current_edit.day].subjects[new_index].title = evt.target.value;
			schedule_load_all();
		}
	});
	document.querySelector(".h2_input").addEventListener("keyup", evt => {
		if(evt.key == "Enter") {
			evt.target.blur();
		} else if(evt.key == "Escape") {
			should_update = false;
			schedule_load_all();
		}
	});
	locally_saved();
}

if(!localStorage.getItem("guru-user")) {
	// User is not defined, redirect to auth page or something.
}
const default_parameters = {
	method: "POST",
	headers: {
		"content-type": "application/json"
	},
	body: JSON.stringify({
		user: localStorage.getItem("guru-user")
	})
}
const API = "https://api.sekolah.nl/";
function save() {
	return new Promise((resolve, reject) => {
		if(can_save) {

			f("save_data", {
				method: "POST",
				headers: {
					"content-type": "application/json"
				},
				body: JSON.stringify({
					user: localStorage.getItem("guru-user"),
					schedules: schedules,
					assignments: assignments
				})
			}).then(d => {
				console.log("[SAVE]", d);
				resolve(200)
			});
		} else {
			resolve();
		}
	})
}
function apply_all() {
	// This will apply the (server-side) saved schedules and assignments
	// To the selected students. This doesn't require can_save because it doesn't
	// provide any values anyway. It doesn't matter if the client has loaded
	// the schedules and assignments or not.
	save().then(d => {
		f("apply_all", {
			method: "POST",
			headers: {
				"content-type": "application/json"
			},
			body: JSON.stringify({
				user: localStorage.getItem("guru-user")
			})
		}).then(d => {
			console.log("[APPLY]", d);
			if(d.status == 200) {
				schedules = d.schedules;
				assignments = d.assignments;
				load_both();
			}
		});
	});
}

update_all();
function update_all() {
	let pr = [];
	pr.push(f("get_schedules"));
	pr.push(f("get_assignments"));
	Promise.all(pr).then(d => {
		schedules = d[0];
		assignments = d[1];
		can_save = true;
		schedule_load_all();
		assignment_load_all();
	});
	update_students();
}
function update_students() {
	f("get_students").then(d => {
		if(d.length > 0) {
			students = d;
		}
	});
}

function f(url, extra = default_parameters) {
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

function clone_day(index, new_index) {
	let days = current_edit.data.days;
	let day_to_clone = Object.assign({}, days[index]);
	let new_arr = [];
	for(let i = 0; i < days.length; i++) {
		if(new_index == i) {
			new_arr.push(day_to_clone);
		}
		new_arr.push(days[i]);
	}
	current_edit.data.days = new_arr;
	locally_saved();
	schedule_load_all();
}

function get_student_selector_html() {
	let new_html = "";
	let missing_html = "";
	let missing_amount = 0;

	students.forEach(student => {
		if(student === 404) {
			missing_amount++
			if(missing_amount == 1) {
				missing_html = `<div class="missing">Er is <span>1</span> onbekende leerling</div>`
			} else {
				missing_html = `<div class="missing">Er zijn <span>${missing_amount}</span> onbekende leerlingen</div>`
			}
		} else {
			new_html += `
			<div class="selectable_student ${current_edit.data.students.includes(student.short) ? 'student_selected' : ''}">
				
				<div class="badge_wrapper">
					<div onclick="toggle_student('${student.short}')" class="badge_small ${current_edit.data.students.includes(student.short) ? 'badge_selected' : 'badge_not_selected'}">
						${current_edit.data.students.includes(student.short) ? 'Geselecteerd' : 'Inactief'}
					</div>
				</div>
				<div class="selectable_student_lower">
					<img alt="" src="${API}img/${student.img}.png" onerror="this.src = '${API}img/default_user.png'">
					<div class="selectable_student_info">
						<h3 class="small_heading">${student.full_name}</h3>
						<span>${student.year}</span>
					</div>
				</div>
			</div>
			`
		}
	});

	new_html = `
		<div class="student_selector universal_padding">
			<h3 class="small_heading">Leerlingen</h3>
			<div class="student_selector_main">
				${new_html}
			</div>
			${missing_html}
		</div>
	`

	return new_html;
}

function toggle_student(short_code) {
	let students = current_edit.data.students
	if(students.includes(short_code)) {
		students.splice(current_edit.data.students.indexOf(short_code), 1);
	} else {
		students.push(short_code);
	}
	locally_saved();
	schedule_load_all();
	assignment_load_all();
}

function get_student_image(short) {
	for(let i = 0; i < students.length; i++) {
		if(students[i].short == short) {
			return students[i].img;
		}
	}
	return short;
}

function set_assignment_hour(v) {
	if(current_edit.data.hour == v) {
		v = 0;
	}
	current_edit.data.hour = v;
	locally_saved();
	assignment_load_all();
}
function set_assignment_type(v) {
	current_edit.data.type = v;
	locally_saved();
	assignment_load_all();
}
function new_assignment_value(v) {
	if(v.trim().length > 0) {
		current_edit.data.assignment = v;
	}
	locally_saved();
	assignment_load_all();
}

function clean_string(e) {
	e = e + "";
	return e.replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function clean_values() {

	if(!current_edit.data) return;

	// Clean up all string values to prevent XSS.
	let data = current_edit.data;
	Object.keys(data).forEach(key => {
		if(typeof data[key] == "string") {
			current_edit.data[key] = clean_string(data[key]);
		}
	});
}

function get_assignment_student_grade_html(assignment) {

	if(!assignment.grades) assignment.grades = {}

	let new_html = "";

	let students_obj = {}
	students.forEach(student => {
		students_obj[student.short] = student;
	});

	assignment.students.forEach(student => {
		let stu = students_obj[student]; 
		// Stu = short for student, this is the student object relevant to the student in the array.
		
		let grade = "";
		if(assignment.grades && assignment.grades[student]) {
			grade = assignment.grades[student];
		}

		new_html += `
			<div class="student_grade_part">
				<div class="student_grade_img">
					<img alt="Profile picture" class="profile_pic" src="${API}img/${get_student_image(student)}.png" onerror="this.src = '${API}img/default_user.png'">
				</div>
				<div class="student_grade_content">
					<h3 class="small_heading">${stu.full_name}</h3>
					<input value="${grade}" oninput="update_num_value(this); update_grade('${student}', this.value)" min="1" max="10" class="student_grade_input" placeholder="10" type="number">
				</div>
			</div>
		`
	});

	if(new_html.length > 0) {
		new_html = `
		<div class="assignment_input_2 assignment_input_grades assignment_input">
			<h3 class="small_heading">Cijfers<sup>(optioneel)</sup></h3>
			<div class="assignment_grade_students_div">
				${new_html}	
			</div>
		</div>
		`
	}

	return new_html;
}

function update_grade(short, value) {
	if(!current_edit.data.grades) {
		current_edit.data.grades = {};
	}
	current_edit.data.grades[short] = value;
	locally_saved();
	save();
}

function update_num_value(element) {
	let n = Number(element.value);
	if(n == 0) return;

	n = Number(n.toString().split("-")[0])

	let min = Number(element.getAttribute("min"));
	let max = Number(element.getAttribute("max"));
	if(n < min) {
		n = min;
	} else if(n > max) {
		n = max;
	}
	element.value = n;
}