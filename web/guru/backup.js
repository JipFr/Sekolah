let previous_day = new Date(current_date.getTime() - 1000 * 60 * 60 * 24);
			let previous_day_str = getDateStr(previous_day);
			let day_index = 0;
			current_edit.data.days.forEach(day => {
				if(day.activated.includes(previous_day_str)) {

					if(current_edit.data.days[day_index + 1] && !current_edit.data.days[day_index + 1].content) {
						extra += " no_content";
					}

					console.log("Match " + previous_day_str, current_edit.data.days[day_index], extra);
					
				}
				day_index++
			});

			if(since_last_row > 0 || true) {
				let e = "";
				if(typeof last_max == "undefined") last_max = 0;
				let index = last_max - since_last_row;
				// ONLY FOR THE LINE!!
				if(current_edit.data &&
					current_edit.data.days &&
					current_edit.data.days[index + 1] &&
					current_edit.data.days[index + 1].content) {
					// If a selected date is empty in the planned schedule this runs.
					e = "next_has_content";
				}

				// THIS IS FOR THE BUTTONS
				if(!(current_edit.data &&
					current_edit.data.days &&
					current_edit.data.days[index] &&
					current_edit.data.days[index].content)) {
					// If a selected date is empty in the planned schedule this runs.
					extra += " no_content";
				}
				if(current_edit.data.days[index] && !current_edit.data.days[index].activated.includes(formatted_str)) {
					current_edit.data.days[index].activated.push(formatted_str);
				}

				if(since_last_row > 1) {
					extra_content = `<div class="calendar_line ${e}"></div>`
				}
			}
			since_last_row--