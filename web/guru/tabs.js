if(!localStorage.getItem("tab")) {
	localStorage.setItem("tab", "schedules");
	localStorage.setItem("backup_tab", "schedules");
}
localStorage.setItem("tab", localStorage.getItem("backup_tab"));
function set_tab(tab_name, is_backup = false) {
	if(!document.querySelector(".container." + tab_name)) return 404;

	localStorage.setItem("tab", tab_name);
	if(is_backup) {
		localStorage.setItem("backup_tab", tab_name);
	}

	update_tab();
}

update_tab();
function update_tab() {
	document.querySelectorAll(".container").forEach(container => {
		container.classList.add("hide-container");
	});
	document.querySelector("." + localStorage.getItem("tab")).classList.remove("hide-container");
	update_nav();
}

function update_nav() {
	document.querySelectorAll("li[data-page]").forEach(div => {
		div.classList.remove("selected");
	});
	if(document.querySelector(`li[data-page="${localStorage.getItem("tab")}"]`)) {
		document.querySelector(`li[data-page="${localStorage.getItem("tab")}"]`).classList.add("selected");
	}
}