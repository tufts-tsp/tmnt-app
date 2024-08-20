// Static variables
var nodes = [];
var total_nodes = 0;
var links = [];
var workflows = {};
var boundaries = {};
var svg;
var simulation;
var dfd_svg_fraction = 0.72;

// Hard coded suggested threats and controls
var threat_suggest = [{
    "threat_num": 1,
    "threat_title": "Spoofing",
    "threat_description": "Pretending to be someone you're not.",
    "threat_status": "Suggested",
    "controls": [],
    "findings": null
},
{
    "threat_num": 2,
    "threat_title": "Tampering",
    "threat_description": "Modifying something on disk, network, memory, etc.",
    "threat_status": "Suggested",
    "controls": [],
    "findings": null
},
{
    "threat_num": 3,
    "threat_title": "Repudiation",
    "threat_description": "Claiming you didn't do something.",
    "threat_status": "Suggested",
    "controls": [],
    "findings": null
}];
var control_suggest = [{
    "control_title": "Authentication",
    "control_description": "Authenticate user identities.",
    "control_status": "Suggested",
    "threats": []
},
{
    "control_title": "Digital Signatures",
    "control_description": "Data validation and tamper detection.",
    "control_status": "Suggested",
    "threats": []
},
{
    "control_title": "Accountability",
    "control_description": "Track all system activities.",
    "control_status": "Suggested",
    "threats": []
}];
    

// Create an SVG on page load
window.onload = function() {
    var date = new Date();
    var displayDate = date.toLocaleDateString();
    var displayTime = date.toLocaleTimeString();
    document.getElementById('datetime').innerHTML += displayDate + " " + displayTime;

    let area = d3.select('.dfd_assetview').node().getBoundingClientRect();

    svg = d3.select('#dfd_svg')
    .attr("width", area.width)
    .attr("height", area.height * dfd_svg_fraction); // TODO make this dynamic with bottom bar

    // Tells d3 how to handle forces
    simulation = d3.forceSimulation(nodes)
    .force("x", d3.forceX(area.width / 2))
    .force("y", d3.forceY(area.height / 2 * dfd_svg_fraction)) // TODO make this dynamic with bottom bar
    .force("collide", d3.forceCollide().radius(100))
    .on("tick", ticked);

    // Creates a definition for an arrowhead, to be used by links later
    svg.append("defs")
    .append("marker")
    .attr("id", "arrow")
    .attr("markerWidth", 20)
    .attr("markerHeight", 20)
    .attr("refX", 20 - 1)
    .attr("refY", 10)
    .attr("orient", "auto")
    .attr("markerUnits", "strokeWidth")
    .append("path")
    .attr("d", 'M 0,0 L 20,10 L 0,20 z')
    .attr("fill", "#000");

    // unselects node(s) if you click on canvas
    svg.on("click", function (e) {
        if (e.target.id == "dfd_svg") {
            // Unselect all nodes
            for (let node of nodes) {
                node.selected = false;
            }
            d3.selectAll(".asset")
                .style("stroke", "black")
                .style("stroke-width", "1");
            resetBottomBar();
        }
    })
}

// Toggles the collapsible bottom bar 
function collapse_bottom_bar() {
    let area = d3.select('.dfd_assetview').node().getBoundingClientRect();

    // uncollapses if bottom bar is already collapsed
    if (dfd_svg_fraction == 0.98) {
        dfd_svg_fraction = 0.72;
        document.getElementById("collapse_button").innerHTML = "&#8595 Collapse";
        document.getElementById("collapse_button").style.cursor = "s-resize";
    }
    // collapses if bottom bar is uncollapsed
    else {
        dfd_svg_fraction = 0.98;
        document.getElementById("collapse_button").innerHTML = "&#8593 Details...";
        document.getElementById("collapse_button").style.cursor = "n-resize";
    }
    svg = d3.select('#dfd_svg')
    .attr("width", area.width)
    .attr("height", area.height * dfd_svg_fraction);

    simulation = d3.forceSimulation(nodes)
    .force("x", d3.forceX(area.width / 2))
    .force("y", d3.forceY(area.height / 2 * dfd_svg_fraction))
    .force("collide", d3.forceCollide().radius(100))
    .on("tick", ticked);
}

// On window resize, run the force simulation again
// so that elements don't ever get stuck off screen
window.onresize = function() {
    // FIXME: Sometimes, AFTER resizing the screen, adding a new element
    // causes it to get stuck in the corner with an error complaining that
    // it is being transformed to NaN coordinates.
    // This seems to fix itself after another resize or two, and also seems
    // more common when the window is particularly small.
    // Why is this happening!?!?

    let area = d3.select('.dfd_assetview').node().getBoundingClientRect();
    // let dfd_svg_fraction = 0.75;

    svg = d3.select('#dfd_svg')
    .attr("width", area.width)
    .attr("height", area.height * dfd_svg_fraction); // TODO make this dynamic with bottom bar

    simulation = d3.forceSimulation(nodes)
    .force("x", d3.forceX(area.width / 2))
    .force("y", d3.forceY(area.height / 2 * dfd_svg_fraction)) // TODO make this dynamic with bottom bar
    .force("collide", d3.forceCollide().radius(100))
    .on("tick", ticked);

    simulation.alpha(1.0).restart();
}

// Toggles between the four question sections (What are we working on?, etc.)
// Determines which one should be displayed.
function showSection(icon) {
    var divs = document.querySelectorAll('.items');
    divs.forEach(div => {
        div.style.display = "none";
    });
    document.getElementById(icon).style.display = "block";

    // Prevent user from trying to add a threat or a control if no
    // assets exist yet in the DFD
    if (icon == "threats") {
        let elems = document.getElementsByClassName('threat_textbox');
        for (let elem of elems) {
            elem.disabled = (nodes.length == 0);
        }
    }
    else if (icon == "controls") {
        let elems = document.getElementsByClassName('controls_textbox');
        for (let elem of elems) {
            elem.disabled = (nodes.length == 0);
        }
    }
    let elems = document.getElementsByClassName('add_button');
    for (let elem of elems) {
        elem.disabled = (nodes.length == 0);
    }

    // Recalculate dropdowns when findings tab is opened
    if (icon == "findings") {
        updateThreatDropdown();
    }
}

// Displays suggested threats and allows users to either add or ignore the 
// suggestions
function showSuggestedThreats() {
    var dropdown = document.getElementById("threat_suggest_dropdown");
    var node_id = getDropdownValue("threat_dropdown");
    if (node_id == -1) {
        dropdown.disabled = true;
        dropdown.add(new Option("Select an asset first!", -1));
        return;
    }

    // Update bottom bar
    svg.selectAll(".node_group").filter(d => d === nodes[node_id]).dispatch('click').dispatch('click');
    updateThreatBadges(nodes[node_id]);

    while (dropdown.options.length > 0) {
        dropdown.remove(0);
    }
    if (nodes[node_id].threats[0].length == 0) {
        dropdown.disabled = true;
        dropdown.add(new Option("No suggested threats for this asset", -1));
    }
    else {
        dropdown.add(new Option("Select a threat...", -1));
        dropdown.disabled = false;
    }
    
    let i = 0;
    for (let threat of nodes[node_id].threats[0]) {
        dropdown.add(new Option(threat.threat_title, i));
        i++;
    }

    // Display selected suggested threat
    dropdown.onchange = function () {
        var threat_id = getDropdownValue("threat_suggest_dropdown");
        var div = document.getElementById("display_suggested_threat");
        if (threat_id == -1) { 
            div.innerHTML = "";
            return; 
        }
        var threat = nodes[node_id].threats[0][threat_id];
        div.innerHTML = "<h4 style=\"margin:0; padding:0\">" + threat.threat_title + " ("+ threat.threat_num + ")</h4><h5 style=\"margin:0; padding:0\">Description</h5>&emsp;&emsp;" + threat.threat_description + "<br><button id=\"add_suggested_threat\" style=\"background-color:white\">Add Threat</button><br><button id=\"ignore_suggested_threat\" style=\"background-color:white\">Ignore Threat</button>";
        document.getElementById("add_suggested_threat").onclick = function () {
            threat.threat_status = "Known";
            nodes[node_id].threats[0].splice(threat_id, 1);
            nodes[node_id].threats[1].push(threat);
            alert("New threat (" + threat.threat_title + ") added to " + nodes[node_id].asset_name + " successfully!");
            div.innerHTML = "";
            showSuggestedThreats();
        }
        document.getElementById("ignore_suggested_threat").onclick = function () {
            if (!confirm("Ignore suggested threat " + threat.threat_title + "?")) {
                return;
            }
            nodes[node_id].threats[0].splice(threat_id, 1);
            div.innerHTML = "";
            showSuggestedThreats();
        }
    }
}

// Displays suggested controls and allows users to either add or ignore the 
// suggestions
function showSuggestedControls() {
    var dropdown = document.getElementById("control_suggest_dropdown");
    var node_id = getDropdownValue("control_dropdown");
    if (node_id == -1) {
        dropdown.disabled = true;
        dropdown.add(new Option("Select an asset first!", -1));
        return;
    }

    // Update bottom bar
    svg.selectAll(".node_group").filter(d => d === nodes[node_id]).dispatch('click').dispatch('click');

    while (dropdown.options.length > 0) {
        dropdown.remove(0);
    }
    if (nodes[node_id].controls[0].length == 0) {
        dropdown.disabled = true;
        dropdown.add(new Option("No suggested controls for this asset", -1));
    }
    else {
        dropdown.add(new Option("Select a control...", -1));
        dropdown.disabled = false;
    }
    
    let i = 0;
    for (let control of nodes[node_id].controls[0]) {
        dropdown.add(new Option(control.control_title, i));
        i++;
    }

    // Display selected suggested control
    dropdown.onchange = function () {
        var control_id = getDropdownValue("control_suggest_dropdown");
        var div = document.getElementById("display_suggested_control");
        if (control_id == -1) { 
            div.innerHTML = "";
            return; 
        }
        var control = nodes[node_id].controls[0][control_id];
        div.innerHTML = "<h4 style=\"margin:0; padding:0\">" + control.control_title + "</h4><h5 style=\"margin:0; padding:0\">Description</h5>&emsp;&emsp;" + control.control_description + "<br><button id=\"add_suggested_control\" style=\"background-color:white\">Add Control</button><br><button id=\"ignore_suggested_control\" style=\"background-color:white\">Ignore Control</button>";
        document.getElementById("add_suggested_control").onclick = function () {
            control.control_status = "Known";
            nodes[node_id].controls[1].push(control);
            nodes[node_id].controls[0].splice(control_id, 1);
            alert("New control (" + control.control_title + ") added to " + nodes[node_id].asset_name + " successfully!");
            div.innerHTML = "";
            showSuggestedControls();
        }
        document.getElementById("ignore_suggested_control").onclick = function () {
            if (!confirm("Ignore suggested control " + control.control_title + "?")) {
                return;
            }
            nodes[node_id].controls[0].splice(control_id, 1);
            div.innerHTML = "";
            showSuggestedControls();
        }
    }
}

// When an Asset button is clicked, this function creates a corresponding
// node, then pushes it to the list of nodes for d3 to draw at a later step.
function addElement(asset_type) {
    // Prompt user for asset name
    let area = d3.select('.dfd_assetview').node().getBoundingClientRect();

    var asset_name = window.prompt("Name this object:", "New " + asset_type);
    if (asset_name == null)
        return;

    // Add new node to nodes array
    let rand_x = area.width/2 + Math.random()*5 - 10;
    let rand_y = area.height/2 + Math.random()*5 - 10;

    // deep cloning hard coded suggested threats and controls
    var threats = [[JSON.parse(JSON.stringify(threat_suggest[0])), JSON.parse(JSON.stringify(threat_suggest[1])), JSON.parse(JSON.stringify(threat_suggest[2]))], [], []];
    var controls = [[JSON.parse(JSON.stringify(control_suggest[0])), JSON.parse(JSON.stringify(control_suggest[1])), JSON.parse(JSON.stringify(control_suggest[2]))], [], []];
    nodes.push({
        "id": total_nodes,
        "asset_type": asset_type,
        "asset_name": asset_name,
        'x': rand_x,
        'y': rand_y,
        "threats": threats,
        "controls": controls,
        "selected": false
    })
    total_nodes++;

    // Select every node and attach it to an asset
    var node_update = svg.selectAll(".node_group")
        .data(simulation.nodes(), function (d) {return d.id});

    // node.enter() gets every NEWLY ADDED node.
    // For each of these, append a node_group g to the new node...
    let node_group = node_update.enter().append("g")
        .on("click", clicked)
        .attr("class", "node_group")
        .call(d3.drag().on("drag", dragged));
        // TODO maybe add a dragend that selects the node if the drag is tiny?
        // that way small drags are still registered as clicks for selection

    // Change onclick if currently adding a trust boundary
    if (document.getElementById("cancel_button")) {
        node_group.on("click", function(d) {
            let selected_node = d3.select(this).data()[0];
            if (selected_node.selected) {
                d3.select(this).selectAll(".asset")
                .style("stroke", "black")
                .style("stroke-width", "1");
            }
            else {
                d3.select(this).selectAll(".asset")
                .style("stroke", "#3E8EDE")
                .style("stroke-width", "4");
            }
            selected_node.selected = !selected_node.selected;
        });
    }

    var form = document.getElementById("asset_info_form");

    // ...attach a shape to that group...
    // (big switch statement to decide the proper shape for asset_type)
    switch (asset_type) {
        case "Actor":
            node_group
            .append('rect')
            .attr('class', 'asset')
            .attr('x', -30)
            .attr('y', -30)
            .attr('width', 60)
            .attr('height', 60)
            .style('fill', 'white')
            .style('stroke', 'black');
            
            // Generate popup form to get more asset information
            form.style.display = "block";
            form.innerHTML = "<span style=\"font-weight:bold\">" + asset_name + "</span><br><span>What is the Actor's type?</span><br><input id=\"actor_type\" type=\"text\" value=\"New User\"><br><span>Does the user have physical access?</span><br><select id=\"actor_access\"><option value=\"No\">No</option><option value=\"Yes\">Yes</option></select><br><button id=\"form_done\">Done</button>";
            
            document.getElementById("form_done").onclick = function () {
                $.ajax({
                    type: "POST",
                    url: addActorUrl,
                    // url: "http://localhost:8000/api/add_actor",
                    // url: "{% url 'api/add_actor' %}",
                    data: {
                        actor_name: asset_name,
                        actor_type: document.getElementById("actor_type").value,
                        actor_access: document.getElementById("actor_access").value,
                    },
                    dataType: "html",
                    success: function(result){
                        alert("Success");
                    },
                });
                form.style.display = "none";
            }
            
            
            break;
        case "Server":
            node_group
            .append('rect')
            .attr('class', 'asset')
            .attr('x', -30)
            .attr('y', -30)
            .attr('width', 60)
            .attr('height', 60)
            .style('fill', 'white')
            .style('stroke', 'black');
            break;
        case "Data Store":
            let radX = 30;
            let radY = 15;

            node_group
            .append('rect')
            .attr('class', 'asset')
            .attr('x', 0 - radX)
            .attr('y', -1.5*radY)
            .attr('width', radX*2)
            .attr('height', radY*3)
            .style('fill', 'white')
            .style('stroke', 'black');

            node_group
            .append('ellipse')
            .attr('class', 'asset')
            .attr('cx', 0)
            .attr('cy', -1.5*radY)
            .attr('rx', radX)
            .attr('ry', radY)
            .style('fill', 'white')
            .style('stroke', 'black');

            node_group
            .append('ellipse')
            .attr('class', 'asset')
            .attr('cx', 0)
            .attr('cy', 1.5*radY)
            .attr('rx', radX)
            .attr('ry', radY)
            .style('fill', 'white')
            .style('stroke', 'black');

            // Generate popup form to get more asset information
            form.style.display = "block";
            form.innerHTML = "<span style=\"font-weight:bold\">" + asset_name + "</span><br><span>What are the associated open ports? (include comma separated list)</span><br><input id=\"o_port\" type=\"text\" value=\"22,53\"><br><span>Who is the associated Actor?</span><br><input id=\"act_name\" type=\"text\" value=\"New Actor\"><br><span>What is the Actor's type?</span><br><input id=\"act_type\" type=\"text\" value=\"New User\"><br><span>Does the user have physical access?</span><br><select id=\"act_access\"><option value=\"No\">No</option><option value=\"Yes\">Yes</option></select><br><span>What is the associated trust boundary's name?</span><br><input id=\"boundary_name\" type=\"text\" value=\"New Trust Boundary\"><br><span>What is the associated machine's type?</span><br><input id=\"machine_type\" type=\"text\" value=\"Physical\"><br><span>What is the datastore's type?</span><br><input id=\"datastore_type\" type=\"text\" value=\"NOSQL\"><br><button id=\"form_done\">Done</button>";
            
            document.getElementById("form_done").onclick = function () {
                $.ajax({
                    type: "POST",
                    url: addDatastoreUrl,
                    data: {
                        actor_name: document.getElementById("act_name").value,
                        actor_type: document.getElementById("act_type").value,
                        actor_access: document.getElementById("act_access").value,
                        boundary_name: document.getElementById("boundary_name").value,
                        name: asset_name,
                        open_ports: document.getElementById("o_port").value,
                        machine: document.getElementById("machine_type").value,
                        ds_type: document.getElementById("datastore_type").value,
                    },
                    data_type: "html",
                    
                    success: function(result){
                        alert("Success");
                    },
                });
                form.style.display = "none";
            }
            
            
            break;
        case "Process":
            node_group
            .append('circle')
            .attr('class', 'asset')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 30)
            .style('fill', 'white')
            .style('stroke', 'black');
        
            
            break;
        case "External Entity":
            node_group
            .append('rect')
            .attr('class', 'asset')
            .attr('x', -30)
            .attr('y', -30)
            .attr('width', 60)
            .attr('height', 60)
            .style('fill', 'white')
            .style('stroke', 'black');
            
            // Generate popup form to get more asset information
            form.style.display = "block";
            form.innerHTML = "<span style=\"font-weight:bold\">" + asset_name + "</span><br><span>What are the associated open ports? (include comma separated list)</span><br><input id=\"o_port\" type=\"text\" value=\"22,53\"><br><span>Who is the associated Actor?</span><br><input id=\"act_name\" type=\"text\" value=\"New Actor\"><br><span>What is the Actor's type?</span><br><input id=\"act_type\" type=\"text\" value=\"New User\"><br><span>Does the user have physical access?</span><br><select id=\"act_access\"><option value=\"No\">No</option><option value=\"Yes\">Yes</option></select><br><span>What is the associated trust boundary's name?</span><br><input id=\"boundary_name\" type=\"text\" value=\"New Trust Boundary\"><br><span>What is the associated machine's type?</span><br><input id=\"machine_type\" type=\"text\" value=\"Physical\"><br><span>Is there physical access to the asset?</span><br><select id=\"physical_access\"><option value=\"No\">No</option><option value=\"Yes\">Yes</option></select><br><button id=\"form_done\">Done</button>";

            document.getElementById("form_done").onclick = function () {
                $.ajax({
                    type: "POST",
                    url: addExternalAssetUrl,
                    data: {
                        actor_name: document.getElementById("act_name").value,
                        actor_type: document.getElementById("act_type").value,
                        actor_access: document.getElementById("act_access").value,
                        boundary_name: document.getElementById("boundary_name").value,
                        name: asset_name,
                        open_ports: document.getElementById("o_port").value,
                        machine: document.getElementById("machine_type").value,
                        physical_access: document.getElementById("physical_access").value,
                    },
                    data_type: "html",
                    
                    success: function(result){
                        alert("Success");
                    },
                });
                form.style.display = "none";
            }
            
            break;
        case "Lambda":
            node_group
            .append('text')
            .attr('class', 'asset')
            .attr('x', -25)
            .attr('y', 40)
            .attr('fill', 'white')
            .style('stroke', 'black')
            .style("font-size", '100pt')
            .style('font-family', 'Calibri')
            .text('λ');
            break;
        case "Trust Boundry":
            node_group
            .append('rect')
            .attr('class', 'asset')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 60)
            .attr('height', 60)
            .style('fill', 'white')
            .attr('stroke-dasharray','5,3')
            .style('stroke', 'black');
            
            var act_name = window.prompt("Who is the associated Actor?", "New Actor");
            var act_type = window.prompt("What is the Actor's type?", "New User");
            var act_access = window.prompt("Does the user have physical access?", "No");
            
            
            $.ajax({
                type: "POST",
                url: "{% url 'api/add_boundary' %}",
                data: {
                    actor_name: act_name,
                    actor_type: act_type,
                    actor_access: act_access,
                    boundary_name: asset_name,
                },
                data_type: "html",
                success: function(result){
                    alert("Success");
                },
            });
            
            
            break;
        default:
            // should never happen
            console.debug("ERROR: addElement() got name " + name + ", which isn't recognized as a shape");
            break;
    }
    
    // ...and attach name of asset, provided by user to that group
    node_group
        .append("text")
        .attr("class", "asset_label")
        .attr("x", 15)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "central")
        .attr("fill", "black")
        .style("font-size", "16pt")
        .text(asset_name);

    // force nodes to start in the center of the canvas
    node_group
        .attr("transform", "translate(" + area.width/2 + "," + area.height/2 + ")")

    // Also, remove any duplicate nodes.
    node_update.exit().remove();

    // Last, (re)run the force simulation
    simulation.nodes(nodes);
    simulation.alpha(1.0).restart();

    updateAssetDropdowns();

    updateThreatBadges(nodes[total_nodes - 1]);

    // Update list of nodes in options dropdown
    if (document.getElementById("options")) {
        var curr_asset = document.getElementById("options").children[0].value;
        document.getElementById("add_dataflow").replaceChild(createDataflowList(curr_asset), document.getElementById("dataflow_button"));
    }
}

// gives nodes new location every time the force simulation runs
function ticked() {
    // Transform links
    svg.selectAll(".link")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    // Transform nodes
    svg.selectAll(".node_group")
        .attr("transform", function(d) { return "translate("+ d.x + "," + d.y + ")"; });

    // Transform dataflows
    svg.selectAll(".link_group").selectAll("text")
        .attr("transform", function(d) { return "translate("+ (d.source.x + d.target.x)/2 + "," + (d.source.y + d.target.y)/2 + ")"; });

    // Transform trust boundaries
    svg.selectAll(".boundary")
        .attr("d", function(d) {
            let boundaryName = d3.select(this).attr("boundaryName");
            let assets = boundaries[boundaryName];
            let jitter = d3.select(this).attr("jitter");
            return calcBoundary(d, assets, jitter);
        });
}

// Function that defines how node groups should behave when dragged.
function dragged(e) {
    e.subject.x = e.x;
    e.subject.y = e.y;
    simulation.alpha(1.0).restart();
}

// Function that defines how node groups should behave when clicked.
function clicked(e) {
    let selected_node = d3.select(this).data()[0]
    let already_selected = selected_node.selected;

    // Unselect all nodes
    for (let node of nodes) {
        node.selected = false;
    }
    d3.selectAll(".asset")
        .style("stroke", "black")
        .style("stroke-width", "1");
        
    // Reselect the clicked on node
    selected_node.selected = !already_selected;

    // Unselect if already clicked
    if (already_selected) {
        resetBottomBar();
        return;
    }

    // Display asset information
    d3.select(this).selectAll(".asset")
        .style("stroke", "#3E8EDE")
        .style("stroke-width", "4");

    bottom_bar_html =
        "<ul class=\"options\" id=\"options\"><li value=\"" + selected_node.id + "\"><a href=\"#\">Options &#9662;</a><ul></ul></li></ul>" + 
        "<h2>" + selected_node.asset_name + "</h2>" + 
        selected_node.asset_type +
        "<br><br>" +
        "<h3>Threats</h3>";

    if (selected_node.threats[0].length > 0) {
        bottom_bar_html += "<div class=\"display\"><button class=\"displaybtn\" style=\"background-color:#808080\">Suggested</button><div class=\"display-content\" style=\"z-index:10\">";
        for (let threat of selected_node.threats[0]) {
            bottom_bar_html += "<a href=\"#\" class=\"asset_threat\">" + threat.threat_title + " ("+ threat.threat_num + ")</a>";
        }
        bottom_bar_html += "</div></div>";
    }
    if (selected_node.threats[1].length > 0) {
        bottom_bar_html += "<div class=\"display\"><button class=\"displaybtn\" style=\"background-color:#FF0000\">Known</button><div class=\"display-content\" style=\"z-index:10\">";
        for (let threat of selected_node.threats[1]) {
            bottom_bar_html += "<a href=\"#\" class=\"asset_threat\">" + threat.threat_title + " ("+ threat.threat_num + ")</a>";
        }
        bottom_bar_html += "</div></div>";
    }
    if (selected_node.threats[2].length > 0) {
        bottom_bar_html += "<div class=\"display\"><button class=\"displaybtn\" style=\"background-color:#0000FF\">Mitigated</button><div class=\"display-content\" style=\"z-index:10\">";
        for (let threat of selected_node.threats[2]) {
            bottom_bar_html += "<a href=\"#\" class=\"asset_threat\">" + threat.threat_title + " ("+ threat.threat_num + ")</a>";
        }
        bottom_bar_html += "</div></div>";
    }
    if (selected_node.threats[0].length == 0 && selected_node.threats[1].length == 0 && selected_node.threats[2].length == 0) {
        bottom_bar_html += "No threats added...<br>";
    }

    bottom_bar_html += "<br><h3>Controls</h3>"
    if (selected_node.controls[0].length > 0) {
        bottom_bar_html += "<div class=\"display\"><button class=\"displaybtn\" style=\"background-color:#808080\">Suggested</button><div class=\"display-content\" style=\"z-index:1\">";
        for (let control of selected_node.controls[0]) {
            bottom_bar_html += "<a href=\"#\" class=\"asset_control\">" + control.control_title + "</a>";
        }
        bottom_bar_html += "</div></div>";
    }
    if (selected_node.controls[1].length > 0) {
        bottom_bar_html += "<div class=\"display\"><button class=\"displaybtn\" style=\"background-color:#FF0000\">Known</button><div class=\"display-content\" style=\"z-index:1\">";
        for (let control of selected_node.controls[1]) {
            bottom_bar_html += "<a href=\"#\" class=\"asset_control\">" + control.control_title + "</a>";
        }
        bottom_bar_html += "</div></div>";
    }
    if (selected_node.controls[2].length > 0) {
        bottom_bar_html += "<div class=\"display\"><button class=\"displaybtn\" style=\"background-color:#0000FF\">Mitigated</button><div class=\"display-content\" style=\"z-index:1\">";
        for (let control of selected_node.controls[2]) {
            bottom_bar_html += "<a href=\"#\" class=\"asset_control\">" + control.control_title + "</a>";
        }
        bottom_bar_html += "</div></div>";
    }
    if (selected_node.controls[0].length == 0 && selected_node.controls[1].length == 0 && selected_node.controls[2].length == 0) {
        bottom_bar_html += "No controls added...<br>";
    }
    
    // places information about the selected node in the bottom bar
    document.getElementById("bottom_bar").innerHTML = bottom_bar_html;

    var threats = document.getElementsByClassName("asset_threat");
    var index = 0;
    for (let threat of selected_node.threats[0]) {
        threats[index].onclick = function () {
            displayThreat(selected_node, 0, threat);
        }
        index++;
    }
    for (let threat of selected_node.threats[1]) {
        threats[index].onclick = function () {
            displayThreat(selected_node, 1, threat);
        }
        index++;
    }
    for (let threat of selected_node.threats[2]) {
        threats[index].onclick = function () {
            displayThreat(selected_node, 2, threat);
        }
        index++;
    }

    var controls = document.getElementsByClassName("asset_control");
    index = 0;
    for (let control of selected_node.controls[0]) {
        controls[index].addEventListener("click", function () {
            displayControl(selected_node, 0, control);
        });
        index++;
    }
    for (let control of selected_node.controls[1]) {
        controls[index].onclick = function () {
            displayControl(selected_node, 1, control);
        }
        index++;
    }
    for (let control of selected_node.controls[2]) {
        controls[index].onclick = function () {
            displayControl(selected_node, 2, control);
        }
        index++;
    }

    // create the options button for the asset
    createAssetOptions();
}

// Displays threat information and allows users to either make changes to 
// the threat
function displayThreat(node, status, threat) {
    var bottom_bar = document.getElementById("bottom_bar");
    bottom_bar.innerHTML = "<h2>" + threat.threat_title + " ("+ threat.threat_num + ")</h2>" + node.asset_name + " | " + threat.threat_status + " Threat<br>";
    if (threat.threat_description != "") {
        bottom_bar.innerHTML += "<br><h3>Description</h3>&emsp;&emsp;" + threat.threat_description + "<br>";
    }
    switch (status) {
        // if displaying a suggested threat
        case 0:
            bottom_bar.innerHTML += "<br><button class=\"view_button\" id=\"add_threat\">Add to " + node.asset_name + "</button><br><button class=\"view_button\" id=\"ignore_threat\">Ignore Suggestion</button><br>";
            setTimeout(function() {
                document.getElementById("add_threat").onclick = function() {
                    threat.threat_status = "Known";
                    node.threats[0].splice(node.threats[0].indexOf(threat), 1);
                    node.threats[1].push(threat);
                    alert("New threat (" + threat.threat_title + ") added to " + node.asset_name + " successfully!");
                    updateThreatBadges(node);
                    displayThreat(node, 1, threat);
                }
                document.getElementById("ignore_threat").onclick = function() {
                    if (!confirm("Ignore suggested threat " + threat.threat_title + "?")) {
                        return;
                    }
                    node.threats[0].splice(node.threats[0].indexOf(threat), 1);
                    updateThreatBadges(node);
                    svg.dispatch('click');
                    svg.selectAll(".node_group").filter(d => d === node).dispatch('click');
                }
            }, 0);
            break;
        // if displaying a mitigated threat
        case 2: 
            bottom_bar.innerHTML += "<br><h3>Controls</h3>";
            var display = document.createElement("div");
            display.id = "control_display";
            for (let control of threat.controls) {
                display.innerText += control.control_title;
                if (control != threat.controls[threat.controls.length - 1]) {
                    display.innerText += ",  ";
                }
            }
            bottom_bar.appendChild(display);
            bottom_bar.innerHTML += "<button class=\"view_button\" id=\"edit_controls\">Edit Controls</button><br>";
            setTimeout(function () {
                document.getElementById("edit_controls").onclick = function () {
                    editAssignedControls(node, threat);
                }
            }, 0);
        // if displaying a known threat
        case 1: 
            bottom_bar.innerHTML += "<br><span>Assign a control: </span><select id=\"assign_control\" disabled><option value=\"invalid\">Add more controls first!</option></select><button id=\"mitigate_threat\" disabled>+</button><br>";
            var dropdown = document.getElementById("assign_control");
            var button = document.getElementById("mitigate_threat");
            var controls = [].concat(node.controls[1], node.controls[2]).filter((c) => !threat.controls.includes(c));
            if (controls.length > 0) {
                dropdown.disabled = false;
                button.disabled = false;
                dropdown.remove(0);
                dropdown.selectedIndex = 0;
                dropdown.add(new Option("Select an asset...", -1));
                for (let i = 0; i < controls.length; i++) {
                    dropdown.add(new Option(controls[i].control_title, i));
                }
            }
            setTimeout(function() {
                button = document.getElementById("mitigate_threat");
                button.onclick = function () {
                    var selected = getDropdownValue("assign_control")
                    if (selected == -1) {
                        alert("Please select a control to assign to " + threat.threat_title + "!");
                        return;
                    }
                    threat.controls.push(controls[selected]);
                    if (threat.threat_status == "Known") {
                        node.threats[1].splice(node.threats[1].indexOf(threat), 1);
                        threat.threat_status = "Mitigated";
                        node.threats[2].push(threat);
                        updateThreatBadges(node);
                    }
                    controls[selected].threats.push(threat);
                    if (controls[selected].control_status == "Known") {
                        node.controls[1].splice(node.controls[1].indexOf(controls[selected]), 1);
                        controls[selected].control_status = "Mitigated";
                        node.controls[2].push(controls[selected]);
                    }
                    displayThreat(node, 2, threat);
                };
            }, 0);
            break;
    }
    // Button to return to viewing current node
    bottom_bar.innerHTML += "<button class=\"view_button\" id=\"threat_view_asset\">View " + node.asset_name + "</button>";
    document.getElementById("threat_view_asset").onclick = function () {
        svg.dispatch('click');
        svg.selectAll(".node_group").filter(d => d === node).dispatch('click');
    }
}

// Allow users to unassign controls from threats while viewing a threat
function editAssignedControls(node, threat) {
    var div = document.getElementById("control_display");
    
    // Make each threat a button
    div.innerHTML = "";
    for (let control of threat.controls) {
        div.innerHTML += "<button class=\"del_control\">&#10006" + control.control_title + "</button>";
        if (control != threat.controls[threat.controls.length - 1]) {
            div.innerHTML += ",  ";
        }
    }
    document.getElementById("edit_controls").style.display = "none";
    var status = 2;
    for (let i = threat.controls.length - 1; i >= 0; i--) {
        setTimeout(function() { 
            document.getElementsByClassName("del_control")[i].onclick = function () {
                var control = threat.controls[i];
                if (!confirm("Remove " + control.control_title + " from " + threat.threat_title + "?")) {
                    return;
                }
                threat.controls.splice(i, 1);
                control.threats.splice(control.threats.indexOf(threat), 1);
                
                // Check if control is no longer mitigated
                if (control.threats.length == 0) {
                    node.controls[2].splice(node.controls[2].indexOf(control), 1);
                    control.control_status = "Known";
                    node.controls[1].push(control);
                }

                // Check if threat is no longer mitigated
                if (threat.controls.length == 0) {
                    node.threats[2].splice(node.threats[2].indexOf(threat), 1);
                    threat.threat_status = "Known";
                    node.threats[1].push(threat);
                    updateThreatBadges(node);
                    status = 1;
                }

                // Reset threat display depending on status
                if (status == 2) { 
                    document.getElementById("done_edit").remove();
                    editAssignedControls(node, threat); 
                }
                else {
                    displayThreat(node, status, threat);
                }
            }
        }, 0);
    }
    var done_edit = document.createElement("button");
    done_edit.id = "done_edit";
    done_edit.onclick = function () {
        displayThreat(node, status, threat);
    }
    done_edit.innerText = "Done";
    document.getElementById("bottom_bar").insertBefore(done_edit, div.nextSibling);
}

// Displays control information and allows users to either make changes to 
// the control
function displayControl(node, status, control) {
    var bottom_bar = document.getElementById("bottom_bar");
    bottom_bar.innerHTML = "<h2>" + control.control_title + "</h2>" + node.asset_name + " | " + control.control_status + " Control<br>";
    if (control.control_description != "") {
        bottom_bar.innerHTML += "<br><h3>Description</h3>&emsp;&emsp;" + control.control_description + "<br>";
    }
    switch (status) {
        // if displaying a suggested control
        case 0:
            bottom_bar.innerHTML += "<br><button class=\"view_button\" id=\"add_control\">Add to " + node.asset_name + "</button><br><button class=\"view_button\" id=\"ignore_control\">Ignore Suggestion</button><br>";
            setTimeout(function() {
                document.getElementById("add_control").onclick = function() {
                    control.control_status = "Known";
                    node.controls[0].splice(node.controls[0].indexOf(control), 1);
                    node.controls[1].push(control);
                    alert("New control (" + control.control_title + ") added to " + node.asset_name + " successfully!")
                    displayControl(node, 1, control);
                }
                document.getElementById("ignore_control").onclick = function() {
                    if (!confirm("Ignore suggested control " + control.control_title + "?")) {
                        return;
                    }
                    node.controls[0].splice(node.controls[0].indexOf(control), 1);
                    svg.dispatch('click');
                    svg.selectAll(".node_group").filter(d => d === node).dispatch('click');
                }
            }, 0);
            break;
        // if displaying a mitigated control
        case 2: 
            bottom_bar.innerHTML += "<br><h3>Threats</h3>";
            var display = document.createElement("div");
            display.id = "threat_display";
            for (let threat of control.threats) {
                display.innerText += threat.threat_title;
                if (threat != control.threats[control.threats.length - 1]) {
                    display.innerText += ",  ";
                }
            }
            bottom_bar.appendChild(display);
            bottom_bar.innerHTML += "<button class=\"view_button\" id=\"edit_threats\">Edit Threats</button><br>";
            setTimeout(function () {
                document.getElementById("edit_threats").onclick = function () {
                    editAssignedThreats(node, control);
                }
            }, 0);
        // if displaying a known control
        case 1: 
            bottom_bar.innerHTML += "<br><span>Assign a threat: </span><select id=\"assign_control\" disabled><option value=\"invalid\">Add more threats first!</option></select><button id=\"mitigate_threat\" disabled>+</button><br>";
            var dropdown = document.getElementById("assign_control");
            var button = document.getElementById("mitigate_threat");
            var threats = [].concat(node.threats[1], node.threats[2]).filter((c) => !control.threats.includes(c));
            if (threats.length > 0) {
                dropdown.disabled = false;
                button.disabled = false;
                dropdown.remove(0);
                dropdown.selectedIndex = 0;
                dropdown.add(new Option("Select an asset...", -1));
                for (let i = 0; i < threats.length; i++) {
                    dropdown.add(new Option(threats[i].threat_title, i));
                }
            }
            setTimeout(function() {
                button = document.getElementById("mitigate_threat");
                button.onclick = function() {
                    var selected = getDropdownValue("assign_control");
                    if (selected == -1) {
                        alert("Please select a threat to be mitigated by " + control.control_title + "!");
                        return;
                    }
                    control.threats.push(threats[selected]);
                    if (control.control_status == "Known") {
                        node.controls[1].splice(node.controls[1].indexOf(control), 1);
                        control.control_status = "Mitigated";
                        node.controls[2].push(control);
                    }
                    threats[selected].controls.push(control);
                    if (threats[selected].threat_status == "Known") {
                        node.threats[1].splice(node.threats[1].indexOf(threats[selected]), 1);
                        threats[selected].threat_status = "Mitigated";
                        node.threats[2].push(threats[selected]);
                        updateThreatBadges(node);
                    }
                    displayControl(node, 2, control);
                };
            }, 0);
            break;
    }
    // Button to return to viewing current node
    bottom_bar.innerHTML += "<button class=\"view_button\" id=\"control_view_asset\">View " + node.asset_name + "</button>";
    document.getElementById("control_view_asset").onclick = function () {
        svg.dispatch('click');
        svg.selectAll(".node_group").filter(d => d === node).dispatch('click');
    }
}

// Allow users to unassign threats from controls while viewing a control
function editAssignedThreats(node, control) {
    var div = document.getElementById("threat_display");
    
    // Make each threat a button
    div.innerHTML = "";
    for (let threat of control.threats) {
        div.innerHTML += "<button class=\"del_threat\">&#10006" + threat.threat_title + "</button>";
        if (threat != control.threats[control.threats.length - 1]) {
            div.innerHTML += ",  ";
        }
    }
    document.getElementById("edit_threats").style.display = "none";
    var status = 2;
    for (let i = control.threats.length - 1; i >= 0; i--) {
        setTimeout(function() { 
            document.getElementsByClassName("del_threat")[i].onclick = function () {
                var threat = control.threats[i];
                if (!confirm("Remove " + threat.threat_title + " from " + control.control_title + "?")) {
                    return;
                }
                control.threats.splice(i, 1);
                threat.controls.splice(threat.controls.indexOf(control), 1);
                
                // Check if threat is no longer mitigated
                if (threat.controls.length == 0) {
                    node.threats[2].splice(node.threats[2].indexOf(threat), 1);
                    threat.threat_status = "Known";
                    node.threats[1].push(threat);
                    updateThreatBadges(node);
                }

                // Check if control is no longer mitigated
                if (control.threats.length == 0) {
                    node.controls[2].splice(node.controls[2].indexOf(control), 1);
                    control.control_status = "Known";
                    node.controls[1].push(control);
                    status = 1;
                }

                // Reset control display depending on status
                if (status == 2) { 
                    document.getElementById("done_edit").remove();
                    editAssignedThreats(node, control); 
                }
                else {
                    displayControl(node, status, control);
                }
            }
        }, 0);
    }
    var done_edit = document.createElement("button");
    done_edit.id = "done_edit";
    done_edit.onclick = function () {
        displayControl(node, status, control);
    }
    done_edit.innerText = "Done";
    document.getElementById("bottom_bar").insertBefore(done_edit, div.nextSibling);
}

// Helper function that gets the value of an HTML dropdown given
// its ID in the HTML document.
function getDropdownValue(html_id) {
    let dropdown = document.getElementById(html_id);
    let value = parseInt(dropdown.options[dropdown.selectedIndex].value);
    return value;
}

// Helper function that finds the index of an asset in the nodes array 
// given the asset's id 
function nodeIndex(node_id) {
    return nodes.findIndex(i => i.id == node_id);
}

// Resets the bottom details bar to default state (nothing selected)
function resetBottomBar() {
    document.getElementById("bottom_bar").innerHTML =
    "<h2 style=\"color: gray\">No asset selected...</h2>" 
    + "<br>" 
    + "<h2 style=\"color: gray\">Select a Workflow: </h2>" 
    + "<select name=\"workflow_dropdown\" class=\"workflow_dropdown\" id=\"workflow_dropdown\" disabled>" 
    + "<option value=\"invalid\">Add a workflow first!</option>" 
    + "</select>"
    + "<button type=\"button\" class=\"view_button\" id=\"workflow_view\" onclick=\"viewWorkflow()\" disabled>View</button>"
    + "<h2 style=\"color: gray\">Select a Trust Boundary: </h2>" 
    + "<select name=\"boundary_dropdown\" class=\"boundary_dropdown\" id=\"boundary_dropdown\" disabled>" 
    + "<option value=\"invalid\">Add a trust boundary first!</option>" 
    + "</select>"
    + "<button type=\"button\" class=\"view_button\" id=\"boundary_view\" onclick=\"viewBoundary()\" disabled>View</button>";
    updateWorkflowDropdown();
    updateBoundaryDropdown();
}

// Create the options dropdown button when viewing an asset
function createAssetOptions() {
    var assetID = document.getElementById("options").children[0].value;
    var options = document.getElementById("options").children[0].children[1];
    var currNode = nodes[nodeIndex(assetID)];

    // creating the button to add new dataflows to the current asset
    var listItem = document.createElement('li');
    listItem.id = "add_dataflow";
    var new_dataflow = document.createElement('a');
    new_dataflow.href = "#";
    new_dataflow.innerHTML = "Create dataflow to...";
    new_dataflow.onclick = function () {
        if (nodes.length < 2) {
            alert("Add more assets first!")
        }
    }
    listItem.appendChild(new_dataflow);
    listItem.appendChild(createDataflowList(assetID));
    options.appendChild(listItem);

    // creating the button to view workflows connected to current asset
    listItem = document.createElement('li');
    listItem.id = "view_workflow";
    var view_workflow = document.createElement('a');
    view_workflow.href = "#";
    view_workflow.innerHTML = "View workflow...";
    view_workflow.onclick = function() {
        var has_workflows = false;
        for (let components of Object.values(workflows)) {
            if (components.includes(currNode)) {
                has_workflows = true;
            }
        }
        if (!has_workflows) {
            alert("There are no workflows with this asset!");
        }
    }
    listItem.appendChild(view_workflow);
    listItem.appendChild(createWorkflowList(currNode));
    options.appendChild(listItem);

    // creating the button to view trust boundaries with current asset
    listItem = document.createElement('li');
    listItem.id = "view_boundary";
    var view_boundary = document.createElement('a');
    view_boundary.href = "#";
    view_boundary.innerHTML = "View trust boundary...";
    view_boundary.onclick = function() {
        var has_boundaries = false;
        for (let assets of Object.values(boundaries)) {
            if (assets.includes(currNode)) {
                has_boundaries = true;
            }
        }
        if (!has_boundaries) {
            alert("There are no trust boundaries with this asset!");
        }
    }
    listItem.appendChild(view_boundary);
    listItem.appendChild(createBoundaryList(currNode));
    options.appendChild(listItem);

    // creating nested delete dropdown menu
    listItem = document.createElement('li');
    var delete_button = document.createElement('a')
    delete_button.href = "#";
    delete_button.innerHTML = "Delete...";
    listItem.appendChild(delete_button);
    var delete_list = document.createElement('ul');

    // creating button for deleting threats
    var threat_li = document.createElement('li');
    var remove_threat = document.createElement('a');
    remove_threat.href = "#";
    remove_threat.innerHTML = "Threat...";
    remove_threat.onclick = function() {
        var threats = currNode.threats[1].concat(currNode.threats[2]);
        if (threats.length == 0) {
            alert("There are no threats added to this asset!");
            return;
        }
        var ul = document.getElementById("options");
        ul.style.display = "none";
        
        // creating the checklist to select threats to delete
        var new_ul = document.createElement("ul");
        new_ul.style.background = "#f3f3f3";
        new_ul.style.borderRadius = "20px";
        new_ul.style.padding = "10px";
        new_ul.style.width = "fit-content";
        new_ul.style.float = "right";
        var new_div = document.createElement("div");
        new_div.innerHTML = "Select threats to be deleted:";
        new_ul.appendChild(new_div);
        for (let threat of threats) {
            let new_li = document.createElement("li");
            let new_label = document.createElement("label");
            new_label.innerHTML = threat.threat_title + " ("+ threat.threat_num + ")";
            let new_input = document.createElement("input");
            new_input.classList.add("flowChecks");
            new_input.type = "checkbox";
            new_label.appendChild(new_input);
            new_li.appendChild(new_label);
            new_ul.appendChild(new_li);
        }
        var submit = document.createElement("button");
        submit.innerHTML = "Done"
        var bar = document.getElementById("bottom_bar");
        submit.onclick = function () {
            var known = currNode.threats[1];
            var mitigated = currNode.threats[2];
            var flow_checks = document.getElementsByClassName("flowChecks");
            for (let i = flow_checks.length - 1; i >= 0; i--) {
                if (flow_checks[i].checked) {
                    if (threats[i].threat_status == "Known") {
                        known.splice(known.indexOf(threats[i]), 1);
                    }
                    else if (threats[i].threat_status == "Mitigated") {
                        mitigated.splice(mitigated.indexOf(threats[i]), 1);
                        // checking mitigated controls with deleted threat
                        var controls = currNode.controls[2];
                        for (let j = controls.length - 1; j >= 0; j--) {
                            if (controls[j].threats.includes(threats[i])) {
                                controls[j].threats.splice(controls[j].threats.indexOf(threats[i]), 1);
                                if (controls[j].threats.length == 0) {
                                    controls[j].control_status == "Known";
                                    currNode.controls[1].push(controls[j]);
                                    controls.splice(j, 1);
                                }
                            }
                        }
                    }
                }
            }
            currNode.threats[1] = known;
            currNode.threats[2] = mitigated;
            let options = document.getElementById("options")
            options.style.display = "block"; 
            svg.selectAll(".node_group").filter(d => d.id === assetID).dispatch('click').dispatch('click');
            updateThreatBadges(currNode);
        }
        new_ul.appendChild(document.createElement("br"));
        new_ul.appendChild(submit);
        new_ul.style.display = "block";
        bar.insertBefore(new_ul, bar.children[0]);
    }
    threat_li.appendChild(remove_threat);
    delete_list.appendChild(threat_li);

    // creating button for deleting controls
    var control_li = document.createElement('li');
    var remove_control = document.createElement('a');
    remove_control.href = "#";
    remove_control.innerHTML = "Control...";
    remove_control.onclick = function() {
        var controls = currNode.controls[1].concat(currNode.controls[2]);
        if (controls.length == 0) {
            alert("There are no controls added to this asset!");
            return;
        }
        var ul = document.getElementById("options");
        ul.style.display = "none";
        
        // creating checklist to select controls to delete
        var new_ul = document.createElement("ul");
        new_ul.style.background = "#f3f3f3";
        new_ul.style.borderRadius = "20px";
        new_ul.style.padding = "10px";
        new_ul.style.width = "fit-content";
        new_ul.style.float = "right";
        var new_div = document.createElement("div");
        new_div.innerHTML = "Select controls to be deleted:";
        new_ul.appendChild(new_div);
        for (let control of controls) {
            let new_li = document.createElement("li");
            let new_label = document.createElement("label");
            new_label.innerHTML = control.control_title;
            let new_input = document.createElement("input");
            new_input.classList.add("flowChecks");
            new_input.type = "checkbox";
            new_label.appendChild(new_input);
            new_li.appendChild(new_label);
            new_ul.appendChild(new_li);
        }
        var submit = document.createElement("button");
        submit.innerHTML = "Done"
        var bar = document.getElementById("bottom_bar");
        submit.onclick = function () {
            var known = currNode.controls[1];
            var mitigated = currNode.controls[2];
            var flow_checks = document.getElementsByClassName("flowChecks");
            for (let i = flow_checks.length - 1; i >= 0; i--) {
                if (flow_checks[i].checked) {
                    if (controls[i].control_status == "Known") {
                        known.splice(known.indexOf(controls[i]), 1);
                    }
                    else if (controls[i].control_status == "Mitigated") {
                        mitigated.splice(mitigated.indexOf(controls[i]), 1);
                        // checking mitigated threats with deleted control
                        var threats = currNode.threats[2];
                        for (let j = threats.length - 1; j >= 0; j--) {
                            if (threats[j].controls.includes(controls[i])) {
                                threats[j].controls.splice(threats[j].controls.indexOf(controls[i]), 1);
                                if (threats[j].controls.length == 0) {
                                    threats[j].threat_status == "Known";
                                    currNode.threats[1].push(threats[j]);
                                    threats.splice(j, 1);
                                }
                            }
                        }
                    }
                }
            }
            currNode.controls[1] = known;
            currNode.controls[2] = mitigated;
            let options = document.getElementById("options")
            options.style.display = "block"; 
            svg.selectAll(".node_group").filter(d => d.id === assetID).dispatch('click').dispatch('click');
            updateThreatBadges(currNode);
        }
        new_ul.appendChild(document.createElement("br"));
        new_ul.appendChild(submit);
        new_ul.style.display = "block";
        bar.insertBefore(new_ul, bar.children[0]);
    }
    control_li.appendChild(remove_control);
    delete_list.appendChild(control_li);

    // creating button for deleting dataflows
    flow_li = document.createElement('li');
    var remove_flow = document.createElement('a');
    remove_flow.href = "#";
    remove_flow.innerHTML = "Dataflow...";
    remove_flow.onclick = function() {
        var flows = [];
        for (let i = 0; i < links.length; i++) {
            if (links[i].source.id == assetID || links[i].target.id === assetID) {
                flows.push(i);
            }
        }
        if (flows.length == 0) {
            alert("There are no dataflows connected to this asset!");
            return;
        }
        var ul = document.getElementById("options");
        ul.style.display = "none";
        var new_ul = document.createElement("ul");
        new_ul.style.background = "#f3f3f3";
        new_ul.style.borderRadius = "20px";
        new_ul.style.padding = "10px";
        new_ul.style.width = "fit-content";
        new_ul.style.float = "right";
        var new_div = document.createElement("div");
        new_div.innerHTML = "Select data flows to be deleted:";
        new_ul.appendChild(new_div);
        for (let flow of flows) {
            let new_li = document.createElement("li");
            let new_label = document.createElement("label");
            new_label.innerHTML = links[flow].source.asset_name + " &#8594 " + links[flow].target.asset_name;
            let new_input = document.createElement("input");
            new_input.classList.add("flowChecks");
            new_input.type = "checkbox";
            new_label.appendChild(new_input);
            new_li.appendChild(new_label);
            new_ul.appendChild(new_li);
        }
        var submit = document.createElement("button");
        submit.innerHTML = "Done"
        var bar = document.getElementById("bottom_bar");
        submit.onclick = function () {
            if (!confirm("This will delete all workflows that include the selected dataflows. Continue?")) {
                return;
            }
            var flow_checks = document.getElementsByClassName("flowChecks");

            // Find and remove connected workflows
            var removed_workflows = false;
            for (let i = 0; i < flows.length; i++) {
                if (flow_checks[i].checked) {
                    var source = links[flows[i]].source;
                    var target = links[flows[i]].target;
                    for (let key of Object.keys(workflows)) {
                        var components = workflows[key];
                        if (components.includes(source) && components.indexOf(source) == components.indexOf(target) - 1) {
                            removed_workflows = true;
                            delete workflows[key];
                        }
                    }
                }
            }
            if (removed_workflows) {
                document.getElementById("view_workflow").replaceChild(createWorkflowList(currNode), document.getElementById("workflow_button"));
            }

            // Remove selected dataflows
            for (let i = flows.length - 1; i >= 0; i--) {
                if (flow_checks[i].checked) {
                    links.splice(flows[i], 1);
                }
            }
            var link_update = svg.selectAll(".link_group").data(links, function(d) { return d.source.id + "-" + d.target.id; });
            link_update.exit().remove();

            let options = document.getElementById("options")
            options.style.display = "block";
            bar.removeChild(bar.children[0]);                   
        }
        new_ul.appendChild(document.createElement("br"));
        new_ul.appendChild(submit);
        new_ul.style.display = "block";
        bar.insertBefore(new_ul, bar.children[0]);
    }
    flow_li.appendChild(remove_flow);
    delete_list.appendChild(flow_li);

    // creating button to delete current asset
    var asset_li = document.createElement('li');
    var del = document.createElement('a');
    del.href = "#";
    del.innerHTML = "Asset";
    del.onclick = function() {
        if (!confirm("This will delete all dataflows, workflows, and trust boundaries connected to this asset. Continue?")) {
            return;
        }
        nodes.splice(nodeIndex(assetID), 1);
        svg.selectAll(".node_group").each(function (d) {
            if (assetID == d.id) {
                d3.select(this).remove();
            }
        });
        updateAssetDropdowns();

        // removing all dataflows connected to this asset
        for (let i = 0; i < links.length; i++) {
            if (links[i].source.id == assetID || links[i].target.id === assetID) {
                links.splice(i, 1);
                i--;
            }
        }
        var link_update = svg.selectAll(".link_group").data(links, function(d) { return d.source.id + "-" + d.target.id; });
        link_update.exit().remove();

        // removing all workflows connected to this asset
        for (let key of Object.keys(workflows)) {
            if (workflows[key].includes(currNode)) {
                delete workflows[key];
            }
        }

        // removing all trust boundaries that include this asset
        for (let boundary of Object.keys(boundaries)) {
            if (boundaries[boundary].includes(currNode)) {
                svg.selectAll(".boundary").each(function(d) {
                    if (boundary == d3.select(this).attr("boundaryName")) {
                        d3.select(this).remove();
                    }
                });
                delete boundaries[boundary];
            }
        }

        resetBottomBar();
    }
    asset_li.appendChild(del);
    delete_list.appendChild(asset_li);
    listItem.appendChild(delete_list);
    options.appendChild(listItem);
}

// Helper function to create/update list of possible new dataflows in   
// options dropdown menu
function createDataflowList(assetID) {
    var dataflow_list = document.createElement('ul');
    dataflow_list.id = "dataflow_button";
    for (let node of nodes) {
        if (node.id == assetID) {
            continue;
        }
        var node_li = document.createElement('li');
        var node_a = document.createElement('a');
        node_a.href = "#";
        node_a.innerHTML = node.asset_name;
        node_a.onclick = function() {
            let dropdowns = document.getElementsByClassName('dropdown');
            dropdowns[0].selectedIndex = nodeIndex(assetID) + 1;
            dropdowns[1].selectedIndex = nodes.indexOf(node) + 1;
            addDataFlow();
        }
        node_li.appendChild(node_a);
        dataflow_list.appendChild(node_li);
    }
    return dataflow_list;
}

// Helper function to create/update list of workflows to view in options 
// dropdown menu
function createWorkflowList(currNode) {
    var workflow_keys = [];
    for (let name of Object.keys(workflows)) {
        if (workflows[name].includes(currNode)) {
            workflow_keys.push(name);
        }
    }
    var workflow_list = document.createElement('ul');
    workflow_list.id = "workflow_button";
    for (let key of workflow_keys) {
        var node_li = document.createElement('li');
        var node_a = document.createElement('a');
        node_a.href = "#";
        node_a.innerHTML = key;
        node_a.onclick = function() {
            resetBottomBar();
            document.getElementById("workflow_dropdown").selectedIndex = Object.keys(workflows).indexOf(key) + 1;
            viewWorkflow();
        }
        node_li.appendChild(node_a);
        workflow_list.appendChild(node_li);
    }
    return workflow_list;
}

// Helper function to create/update list of trust boundaries to view in 
// options dropdown menu
function createBoundaryList(currNode) {
    var boundary_keys = [];
    for (let name of Object.keys(boundaries)) {
        if (boundaries[name].includes(currNode)) {
            boundary_keys.push(name);
        }
    }
    var boundary_list = document.createElement('ul');
    boundary_list.id = "boundary_button";
    for (let key of boundary_keys) {
        var node_li = document.createElement('li');
        var node_a = document.createElement('a');
        node_a.href = "#";
        node_a.innerHTML = key;
        node_a.onclick = function() {
            resetBottomBar();
            document.getElementById("boundary_dropdown").selectedIndex = Object.keys(boundaries).indexOf(key) + 1;
            viewBoundary();
        }
        node_li.appendChild(node_a);
        boundary_list.appendChild(node_li);
    }
    return boundary_list;
}

// Clears the workflow dropdown list, then regenerates them
// with the names of every existing workflow
function updateWorkflowDropdown() {
    let workflow_dropdown = document.getElementById("workflow_dropdown");
    let view_button = document.getElementById("workflow_view");

    while (workflow_dropdown.options.length > 0) {
        workflow_dropdown.remove(0);
    }

    if (Object.keys(workflows).length == 0) {
        workflow_dropdown.add(new Option("Add a workflow first!", -1));
        workflow_dropdown.disabled = true;
        view_button.disabled = true;
    }
    else {
        workflow_dropdown.add(new Option("Select a workflow...", -1));
        workflow_dropdown.disabled = false;
        view_button.disabled = false;
        var workflow_names = Object.keys(workflows);
        for (let workflow_name of workflow_names) {
            workflow_dropdown.add(new Option(workflow_name));
        }
    }
}

// Clears the trust boundary dropdown list, then regenerates them
// with the names of every existing trust boundary
function updateBoundaryDropdown() {
    let boundary_dropdown = document.getElementById("boundary_dropdown");
    let view_button = document.getElementById("boundary_view");

    while (boundary_dropdown.options.length > 0) {
        boundary_dropdown.remove(0);
    }

    if (Object.keys(boundaries).length == 0) {
        boundary_dropdown.add(new Option("Add a trust boundary first!", -1));
        boundary_dropdown.disabled = true;
        view_button.disabled = true;
    }
    else {
        boundary_dropdown.add(new Option("Select a trust boundary...", -1));
        boundary_dropdown.disabled = false;
        view_button.disabled = false;
        var boundary_names = Object.keys(boundaries);
        for (let boundary_name of boundary_names) {
            boundary_dropdown.add(new Option(boundary_name));
        }
    }
}

// Clears the asset dropdown lists, then regenerates them
// with the names of every existing element
function updateAssetDropdowns() {
    let dropdowns = document.getElementsByClassName('dropdown');

    while (dropdowns[0].options.length > 0) {
        for (let dropdown of dropdowns) {
            dropdown.remove(0);
        }
    }

    let elems = document.getElementsByClassName('add_button');
    for (let elem of elems) {
        elem.disabled = (nodes.length == 0);
    }

    if (nodes.length != 0) {
        for (let dropdown of dropdowns) {
            dropdown.disabled = false;
            dropdown.selectedIndex = 0;
            dropdown.add(new Option("Select an asset...", -1));
        }
    }
    else {
        for (let dropdown of dropdowns) {
            dropdown.disabled = true;
            dropdown.add(new Option("Add an asset first!", -1));
        }
        return;
    }

    const svg = d3.select(document.getElementById("dfd")).select("svg");
    svg.selectAll(".node_group").each(function (d, i) {
        for (let dropdown of dropdowns) {
            dropdown.add(new Option(
                d3.select(this).select(".asset_label").text(),
                nodeIndex(d.id)
            ))
        }
    });
}

// Clears the threat dropdown lists, then regenerates them
// with the names of every existing element
function updateThreatDropdown() {
    let threat_dropdown = document.getElementById("findings_threats_dropdown");
    let node_id = getDropdownValue("findings_asset_dropdown");
    threat_dropdown.disabled = true;

    while (threat_dropdown.options.length > 0) {
        threat_dropdown.remove(0);
    }

    if (nodes.length == 0) {
        threat_dropdown.add(new Option("Add an asset first!", -1));
    }
    else if (node_id == -1) {
        threat_dropdown.add(new Option("Select an asset first!", -1));
    }
    else if (nodes[node_id].threats.length == 0) {
        threat_dropdown.add(new Option("No threats on this asset", -1));
    }
    else {
        threat_dropdown.add(new Option("Select a threat...", -1));
        threat_dropdown.disabled = false;
    }

    updateFindings();
    if (threat_dropdown.disabled) {
        document.getElementById("greyed_out").style.setProperty("color", "grey")
        return;
    }

    let i = 0;
    for (let threats of nodes[node_id].threats) {
        threat_dropdown.add(new Option(threats.threat_title, i));
        i++;
    }
}

// helper function that fills out dropdowns in the Did we do a good enough
// job? tab
function populateSelects(status_dropdown, harm_dropdown, exploitability_dropdown) {
    status_dropdown.disabled = false;
    status_dropdown.add(new Option("Open", 0));
    status_dropdown.add(new Option("Resolved", 1));
    status_dropdown.add(new Option("Not Relevant", 2));

    harm_dropdown.disabled = false;
    harm_dropdown.add(new Option("Negligible", 0));
    harm_dropdown.add(new Option("Minor", 1));
    harm_dropdown.add(new Option("Serious", 2));
    harm_dropdown.add(new Option("Critical", 3));
    harm_dropdown.add(new Option("Catastrophic", 4));

    exploitability_dropdown.disabled = false;
    exploitability_dropdown.add(new Option("Unknown", 0));
    exploitability_dropdown.add(new Option("Low", 1));
    exploitability_dropdown.add(new Option("Medium", 2));
    exploitability_dropdown.add(new Option("High", 3));
}

// function changes the list of controls depending on which asset and
// threat are selected in the Did we do a good enough job? tab
// also greys out findings tab if an asset and threat have not been
// selected yet
function updateFindings() {
    // Get various HTML elements
    let node_id = getDropdownValue("findings_asset_dropdown");
    let selected_threat = getDropdownValue("findings_threats_dropdown");

    let controls_div = document.getElementById("control_findings");
    let status_dropdown = document.getElementById("status_dropdown");
    let harm_dropdown = document.getElementById("harm_dropdown");
    let exploitability_dropdown = document.getElementById("exploitability_dropdown");
    let radio_buttons = document.getElementsByClassName("tech_impact_radio");
    let assessor_textbox = document.getElementById("assessor_textbox");
    let notes_textbox = document.getElementById("notes_textbox")

    // Clear all of the dropdowns and disable all of the buttons
    while (status_dropdown.options.length > 0) {
        status_dropdown.remove(0);
    }
    while (harm_dropdown.options.length > 0) {
        harm_dropdown.remove(0);
    }
    while (exploitability_dropdown.options.length > 0) {
       exploitability_dropdown.remove(0);
    }
    status_dropdown.disabled = true;
    harm_dropdown.disabled = true;
    exploitability_dropdown.disabled = true;
    for (let rb of radio_buttons) {
        rb.checked = false;
        rb.disabled = true;
    }
    assessor_textbox.disabled = true;
    assessor_textbox.value = "";
    notes_textbox.disabled = true;
    notes_textbox.value = "";

    controls_div.innerHTML = "";

    // If we haven't selected an asset:
    if (node_id == -1) {
        // Disable everything, report correct error text
        controls_div.innerHTML = "&ensp;<span style=\"color: grey\">Select an asset first!</span>";
        status_dropdown.add(new Option("Select an asset first!", -1));
        harm_dropdown.add(new Option("Select an asset first!", -1));
        exploitability_dropdown.add(new Option("Select an asset first!", -1));
        document.getElementById("greyed_out").style.setProperty("color", "grey");
        return;
    }
    // Otherwise, if we've selected an asset but not a threat:
    else if (nodes[node_id].threats.length == 0 || selected_threat == -1) {
        // Disable everything, report correct error text
        controls_div.innerHTML = "&ensp;<span style=\"color: grey\">Select a threat first!</span>";
        status_dropdown.add(new Option("Select a threat first!", -1));
        harm_dropdown.add(new Option("Select an threat first!", -1));
        exploitability_dropdown.add(new Option("Select an threat first!", -1));
        document.getElementById("greyed_out").style.setProperty("color", "grey");
        return;
    }
    // Otherwise, if an asset and threat are selected, but no controls
    // exist on the asset:
    else if (nodes[node_id].controls.length == 0) {
        // Enable everything except the controls section,
        // and report correct error text
        controls_div.innerHTML = "&ensp;<span style=\"color: grey\">No controls for this asset</span>";

        populateSelects(status_dropdown, harm_dropdown, exploitability_dropdown);
        for (let rb of radio_buttons) {
            rb.disabled = false;
        }
        assessor_textbox.disabled = false;
        notes_textbox.disabled = false;
        document.getElementById("greyed_out").style.setProperty("color", "black");
    }
    else {
        // Otherwise: Enable everything
        populateSelects(status_dropdown, harm_dropdown, exploitability_dropdown);
        for (let rb of radio_buttons) {
            rb.disabled = false;
        }
        assessor_textbox.disabled = false;
        notes_textbox.disabled = false;
        document.getElementById("greyed_out").style.setProperty("color", "black");

        // Since controls exist, create a checkbox for each one
        let i = 0;
        for (let control of nodes[node_id].controls) {
            let title = control.control_title
            controls_div.innerHTML +=
                "&emsp;<input type=\"checkbox\" id=\"control_"+ i +"_checkbox\" name=\"control_checkbox\" value=\""+ title +"\"><label for=\"control_" + i + "_checkbox\">" + title + "</label><br>";
            i++;
        }
    }

    // If we previously set and saved a finding for this threat, then load
    // any previously saved values and show them back to the user
    findings = nodes[node_id].threats[selected_threat].findings;
    if (findings != null) {
        assessor = document.getElementById("assessor_textbox");
        assessment_date = document.getElementById("datetime");
        let date = findings.assessment_date;
        let displayDate = date.toLocaleDateString();
        let displayTime = date.toLocaleTimeString();
        notes_textbox = document.getElementById("notes_textbox");

        status_dropdown.selectedIndex = findings.status;
        exploitability_dropdown.selectedIndex = findings.exploitability;
        harm_dropdown.selectedIndex = findings.exploitability;
        assessor.value = findings.assessor;
        assessment_date.innerHTML = "<b>Assessed on:</b> " + displayDate + " " + displayTime;
        notes_textbox.value = findings.notes;

        document.querySelector("input[name=\"radio_confidentiality\"][value=\"" + findings.technical_impact.confidentiality + "\"]").checked = true;
        document.querySelector("input[name=\"radio_integrity\"][value=\"" + findings.technical_impact.integrity + "\"]").checked = true;
        document.querySelector("input[name=\"radio_availability\"][value=\"" + findings.technical_impact.availability + "\"]").checked = true;
        document.querySelector("input[name=\"radio_authenticity\"][value=\"" + findings.technical_impact.authenticity + "\"]").checked = true;
        document.querySelector("input[name=\"radio_nonrepudiation\"][value=\"" + findings.technical_impact.nonrepudiation + "\"]").checked = true;
        document.querySelector("input[name=\"radio_authorization\"][value=\"" + findings.technical_impact.authorization + "\"]").checked = true;

        checked_boxes = findings.controls
        for (i = 0; i < checked_boxes.length; ++i) {
           control = document.getElementById(checked_boxes[i].id)
           control.checked = "checked";
        }
    }

}

// Adds a dataflow line between two chosen elements.
function addDataFlow() {
    // Get the currently selected assets to draw a dataflow between.
    let source = getDropdownValue("source_dropdown");
    let target = getDropdownValue("target_dropdown");
    let double_headed = false

    // Check that user actually has two assets selected:
    if (source == -1 || target == -1) {
        alert("Please select two assets to create a dataflow between!");
        return;
    }

    // Prevent dataflows from being added that point
    // from an object to itself
    if (source === target) {
        alert("Cannot add a dataflow with identical source and target!");
        return;
    }

    for (let link of links) {
        // Prevent duplicate dataflows
        if (link.source.id === nodes[source].id && link.target.id === nodes[target].id) {
            alert("Cannot add a duplicate dataflow!");
            return;
        }
        else if (link.source.id === nodes[target].id && link.target.id === nodes[source].id) {
            double_headed = true
        }
    }

    // Prompt user for dataflow name...
    var dataflow_name = window.prompt("(Optional) Name this dataflow:", "");
    // Return from function if user cancels
    if (dataflow_name === null || dataflow_name === false)
        return;

    // Define the link that d3 will use to apply forces...
    let link = {
        "source": nodes[source],
        "target": nodes[target],
        "type": "Test -->",
        "distance": 30
    }
    // ...and append it to our array of links
    links.push(link);

    // Then, get a selection containing the changes to links from this step
    var link_update = svg.selectAll(".link").data(links,
    function(d) { return d.source.id + "-" + d.target.id; });

    // Use that selection to get the newly added link,
    // and create a group to add the link
    var link_group = link_update.enter()
    .append("g")
    .attr("class", "link_group")

    // Append a line to that group...
    link_group
        .insert("line", ".node") // "insert a line into the SVG right before each .node in the SVG"
        .attr("class", "link")
        .attr("stroke", "black")
        .attr("marker-end", "url(#arrow)")
        .attr("markerWidth", 300)

    // ...as well as a name, if one was given
    if (dataflow_name != null) {
        link_group
            .append("text")
            .attr("class", "dataflow_name")
            .attr("x", 35)
            .attr("y", (double_headed) ? 35 : 15) // In case of double-headed dataflow, push second label down
                           // TODO: probably can make this look much cleaner
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "central")
            .attr("fill", "black")
            .style("font-size", "16pt")
            .text(dataflow_name);
    }

    // Check if this new dataflow is an inter-trust boundary flow
    for (let boundary of Object.keys(boundaries)) {
        var assets = boundaries[boundary];
        if ((assets.includes(nodes[source]) && !assets.includes(nodes[target])) || (assets.includes(nodes[target]) && !assets.includes(nodes[source]))) {
            var jitter; 
            if (d3.selectAll(".boundary").filter(function() {return d3.select(this).attr("boundaryName") === boundary;}).empty()) {
                jitter = (Math.random() * 0.3) + 0.1;
            }
            else {
                jitter = d3.selectAll(".boundary").filter(function() {
                    return d3.select(this).attr("boundaryName") === boundary;
                }).attr("jitter");
            }
            appendTrustPath(link_group, boundary, jitter);
        }
    }

    // Remove any links that need to be removed
    link_update.exit().remove();

    // Last, tell our simulation to restart
    simulation.alpha(1.0).restart();
}

// Defines the process of adding components to create a new workflow 
function addComponents() {
    if (links.length < 1) {
        alert("Please add a data flow first!");
        return;
    }
    var comp_buttons = document.getElementsByName("component_dropdown");
    
    // Remove the button next to the last asset dropdown
    if (comp_buttons.length > 1) {
        let toRemove = document.getElementById("remove_button");
        if (toRemove != null) { toRemove.remove() };
    }

    // Create the new div to be appended to the existing dropdowns
    var newDiv = document.createElement('div');
    newDiv.classList.add("component_div");

    // Create the label for the next selection
    var label = document.createElement('label');
    var ordinal = comp_buttons.length + 1;
    if (ordinal % 10 == 1 && ordinal % 100 != 11) {
        ordinal += "st:";
    }
    else if (ordinal % 10 == 2 && ordinal % 100 != 12) {
        ordinal += "nd:";
    }
    else if (ordinal % 10 == 3 && ordinal % 100 != 13) {
        ordinal += "rd:";
    }
    else {
        ordinal += "th:";
    }
    label.innerHTML = ordinal;
    newDiv.appendChild(label);

    // Create the next asset dropdown 
    var componentsDropdown = document.createElement('select');
    componentsDropdown.classList.add('dropdown');
    componentsDropdown.name = "component_dropdown";
    componentsDropdown.add(new Option("Select an asset...", -1));
    const svg = d3.select(document.getElementById("dfd")).select("svg");
    svg.selectAll(".node_group").each(function (d, i) {
        componentsDropdown.add(new Option(d3.select(this).select(".asset_label").text(), nodeIndex(d.id)))
    });
    newDiv.appendChild(componentsDropdown);

    // Create the remove button 
    var removeButton = document.createElement('button');
    removeButton.id = "remove_button";
    removeButton.setAttribute("type", "button");
    removeButton.classList.add("small_button");
    removeButton.innerHTML = "-";
    removeButton.setAttribute('onclick', 'removeComponent();');
    newDiv.appendChild(removeButton);

    // Finally append everything to the existing dropdowns
    var addingWorkflows = document.getElementById('adding_workflows');
    addingWorkflows.append(newDiv);
}

// Defines how the remove button behaves
function removeComponent() {
    // Remove the last asset dropdown
    var divs = document.getElementsByClassName("component_div")
    divs[divs.length - 1].remove();

    // Add back the remove button if there's still more than one dropdown
    if (divs.length > 0) {
        var removeButton = document.createElement('button');
        removeButton.id = "remove_button";
        removeButton.setAttribute("type", "button");
        removeButton.classList.add("small_button");
        removeButton.innerHTML = "-";
        removeButton.setAttribute('onclick', 'removeComponent();');
        divs[divs.length - 1].appendChild(removeButton);
    }
}

// Adds a work flow between the chosen elements
function addWorkFlow() {
    if (links.length < 1) {
        alert("Please add a data flow first!");
        return;
    }
    
    // Get the currently selected assets
    var comp_dropdowns = document.getElementsByName("component_dropdown");

    if (comp_dropdowns.length < 2) {
        alert("Please select at least two components to create a workflow!");
        return;
    }

    const components = [];

    for (let dropdown of comp_dropdowns) {
        var selected = dropdown.value;

        // Check that user has selected all components 
        if (selected == -1) {
            alert("Please make a selection for each component or remove components!");
            return;
        }
        // Check that user has not selected duplicate components 
        if (components.includes(nodes[selected])) {
            alert("Do not include more than one of the same component!");
            return; 
        }
        components.push(nodes[selected]);
    }

    // Check that there's a dataflow between each element in the right order
    for (let i = 0; i < components.length - 1; i++) {
        if (!links.find(link => link.source === components[i] && link.target === components[i + 1])) {
            alert("There is no data flow from " + components[i].asset_name + " to " + components[i + 1].asset_name);
            return;
        };
    }

    // Prevent duplicate workflows
    for (let workflow of Object.values(workflows)) {
        if (components.length != workflow.length) {
            continue;
        }
        let check_duplicate = true;
        for (let i = 0; i < components.length; i++) {
            if (workflow[i] != components[i]) {
                check_duplicate = false;
                break;
            }
        }
        if (check_duplicate) {
            alert("Cannot add a duplicate workflow!");
            return;
        }
    }

    // Prompt user for workflow name...
    var workflow_name = window.prompt("(Optional) Name this workflow:", "");
    // Prevent duplicate names
    while (Object.keys(workflows).includes(workflow_name)) {
        workflow_name = window.prompt(workflow_name + " already exists. Choose a different name:", "");
    }

    // Return from function if user cancels
    if (workflow_name === null || workflow_name === false)
        return;
        
    // Set default workflow name if user does not name it 
    var length = Object.keys(workflows).length + 1;
    if (workflow_name == "") {
        workflow_name = "Workflow " + length;
    }
    // Prevent duplicate names
    while (Object.keys(workflows).includes(workflow_name)) {
        length++;
        workflow_name = "Workflow " + length;
    }
    workflows[workflow_name] = components;

    // Update the bottom bar's workflow dropdown
    if (document.getElementById("workflow_dropdown")) {
        resetBottomBar();
    }

    // Update options button workflow list
    if (document.getElementById("view_workflow")) {
        var currNode = nodes[nodeIndex(document.getElementById("options").children[0].value)];
        if (components.includes(currNode)) {
            document.getElementById("view_workflow").replaceChild(createWorkflowList(currNode), document.getElementById("workflow_button"));
        }
    }
}

// Highlights the components of a workflow that the user selects to view
function viewWorkflow() {
    // Check that user actually selects a workflow
    if (getDropdownValue("workflow_dropdown") == -1) {
        alert("Please select a workflow to view!");
        return;
    }

    let dropdown = document.getElementById("workflow_dropdown");
    var selectedWorkflow = dropdown.options[dropdown.selectedIndex].text;
    var components = workflows[selectedWorkflow];

    // Unselect any currently selected nodes
    for (let node of nodes) {
        node.selected = false;
    }
    d3.selectAll(".asset")
        .style("stroke", "black")
        .style("stroke-width", "1");
    
    // Selects and highlights the components of the workflow being viewed
    svg.selectAll(".node_group").each(function (d) {
        if (components.includes(d)) {
            d3.select(this).selectAll(".asset")
            .style("stroke", "#3E8EDE")
            .style("stroke-width", "4");
        }
    });

    // Updates bottom bar to display order of components in workflow 
    let bottom_bar_html = "<h2>"+ selectedWorkflow +"</h2> <h3 style=\"font-weight:normal\">";
    for (let component of components) {
        bottom_bar_html += "<span style=\"cursor: pointer\" class=\"component\">" + component.asset_name + "</span>";
        if (component != components[components.length - 1]) {
            bottom_bar_html += " &#8594 ";
        }
    }
    bottom_bar_html += "</h3> <br> <button type=\"button\" class=\"view_button\" id=\"edit_button\">Edit Components</button>";
    bottom_bar_html += "<br> <button type=\"button\" class=\"view_button\" id=\"unselect_button\">Unselect Workflow</button>";
    bottom_bar_html += "<br> <button type=\"button\" class=\"view_button\" id=\"remove_workflow\">Remove Workflow</button>";
    document.getElementById("bottom_bar").innerHTML = bottom_bar_html;
    document.getElementById("edit_button").onclick = function () {editWorkflow(selectedWorkflow)};
    var unselect_button = document.getElementById("unselect_button");
    unselect_button.onclick = function () {
        // Unselect all nodes
        for (let node of nodes) {
            node.selected = false;
        }
        d3.selectAll(".asset")
            .style("stroke", "black")
            .style("stroke-width", "1");
        resetBottomBar();
    }
    var remove_button = document.getElementById("remove_workflow");
    remove_button.onclick = function () {
        // Unselect all nodes
        for (let node of nodes) {
            node.selected = false;
        }
        d3.selectAll(".asset")
            .style("stroke", "black")
            .style("stroke-width", "1");
        delete workflows[selectedWorkflow];
        resetBottomBar();
    }

    // create buttons to select/view each asset in the workflow
    var spans = document.getElementsByClassName("component");
    for (let i = 0; i < components.length; i++) {
        spans[i].onclick = function() {
            svg.selectAll(".node_group").filter(d => d === components[i]).dispatch('click');
        };
    }
}

// Allow users to add and remove assets from a workflow being viewed in the 
// details bar
function editWorkflow(selectedWorkflow) {
    // Unselects all nodes
    d3.selectAll(".asset")
        .style("stroke", "black")
        .style("stroke-width", "1");
        
    // Selects and highlights the components of the workflow being viewed
    var components = workflows[selectedWorkflow];
    svg.selectAll(".node_group").each(function (d) {
        if (components.includes(d)) {
            d3.select(this).selectAll(".asset")
                .style("stroke", "#3E8EDE")
                .style("stroke-width", "4");
        }
    });

    let bottom_bar_html = "<h2>"+ selectedWorkflow +"</h2> <h3 style=\"font-weight:normal\"><select class=\"add_dropdown\" id=\"front_dropdown\" disabled><option value=\"invalid\">Add more assets first!</option></select><button class=\"small_button\" id=\"front_button\" disabled>+</button> &#8594 ";
    for (let component of components) {
        bottom_bar_html += "<span style=\"cursor: pointer\" class=\"component\">&#10006" + component.asset_name + "</span> &#8594 ";
    }
    bottom_bar_html += "<select class=\"add_dropdown\" id=\"back_dropdown\" disabled><option value=\"invalid\">Add more assets!</option></select><button class=\"small_button\" id=\"back_button\" disabled>+</button></h3> <br> <button type=\"button\" class=\"view_button\" id=\"done_button\">Done</button>";
    document.getElementById("bottom_bar").innerHTML = bottom_bar_html;
    
    // Check if there are assets that can be added to workflow
    if (nodes.length > workflows[selectedWorkflow].length) { 
        document.getElementById("front_button").disabled = false;
        document.getElementById("back_button").disabled = false;
        var dropdowns = document.getElementsByClassName("add_dropdown");
        for (let dropdown of dropdowns) {
            dropdown.remove(0);
            dropdown.disabled = false;
            dropdown.selectedIndex = 0;
            dropdown.add(new Option("Select an asset...", -1));
        }
        svg.selectAll(".node_group").filter(d => !components.includes(d)).each(function (d, i) {
            for (let dropdown of dropdowns) {
                dropdown.add(new Option(
                    d3.select(this).select(".asset_label").text(),
                    nodeIndex(d.id)
                ))
            }
        });
    }        
    
    // Creating button to add to front of a workflow
    var front_dropdown = document.getElementById("front_dropdown");
    document.getElementById("front_button").onclick = function() {
        var selected = getDropdownValue("front_dropdown");
        if (selected == -1) {
            alert("Please select an asset to add to the front of the workflow.");
            return;
        }
        var valid = false;
        for (let link of links) {
            if (link.source == nodes[selected] && link.target == components[0]) {
                valid = true;
            }
        }
        if (!valid) {
            alert("There is no dataflow from " + nodes[selected].asset_name + " to " + components[0].asset_name);
            return;
        }
        components.unshift(nodes[selected]);
        workflows[selectedWorkflow] = components;
        editWorkflow(selectedWorkflow);
    }

    // Creating button to add to back of a workflow
    var back_dropdown = document.getElementById("back_dropdown");
    document.getElementById("back_button").onclick = function() {
        var selected = getDropdownValue("back_dropdown");
        var back = components[components.length - 1];
        if (selected == -1) {
            alert("Please select an asset to add to the back of the workflow.");
            return;
        }
        var valid = false;
        for (let link of links) {
            if (link.source == back && link.target == nodes[selected]) {
                valid = true;
            }
        }
        if (!valid) {
            alert("There is no dataflow from " + back.asset_name + " to " + nodes[selected].asset_name);
            return;
        }
        components.push(nodes[selected]);
        workflows[selectedWorkflow] = components;
        editWorkflow(selectedWorkflow);
    }

    // Making each existing component into a button to remove that 
    // component from the workflow
    var spans = document.getElementsByClassName("component");
    for (let i = 1; i < components.length - 1; i++) {
        spans[i].onclick = function() {
            if (!confirm("This will delete " + selectedWorkflow + " because workflows cannot have breaks. Continue?")) {
                return;
            }
            delete workflows[selectedWorkflow];
            // Unselect all nodes
            for (let node of nodes) {
                node.selected = false;
            }
            d3.selectAll(".asset")
                .style("stroke", "black")
                .style("stroke-width", "1");
            resetBottomBar();
        };
    }
    spans[0].onclick = function() {
        if (!confirm("Remove " + components[0].asset_name + " from this workflow?")) {
            return;
        }
        components.shift();
        workflows[selectedWorkflow] = components;
        editWorkflow(selectedWorkflow);
    }
    spans[spans.length - 1].onclick = function() {
        if (!confirm("Remove " + components[spans.length - 1].asset_name + " from this workflow?")) {
            return;
        }
        components.pop();
        workflows[selectedWorkflow] = components;
        editWorkflow(selectedWorkflow);
    }

    // Allow user to stop editing the workflow
    document.getElementById("done_button").onclick = function () {
        resetBottomBar();
        document.getElementById("workflow_dropdown").selectedIndex = Object.keys(workflows).indexOf(selectedWorkflow) + 1;
        viewWorkflow();
    }
}

function viewBoundary() {
    // Check that user actually selects a trust boundary
    if (getDropdownValue("boundary_dropdown") == -1) {
        alert("Please select a trust boundary to view!");
        return;
    }

    let dropdown = document.getElementById("boundary_dropdown");
    var selectedBoundary = dropdown.options[dropdown.selectedIndex].text;
    var assets = boundaries[selectedBoundary];

    // Unselect any currently selected nodes
    for (let node of nodes) {
        node.selected = false;
    }
    d3.selectAll(".asset")
        .style("stroke", "black")
        .style("stroke-width", "1");
    
    // Selects and highlights the assets of the trust boundary being viewed
    svg.selectAll(".node_group").each(function (d) {
        if (assets.some(i => i.id == d.id)) {
            d3.select(this).selectAll(".asset")
            .style("stroke", "#3E8EDE")
            .style("stroke-width", "4");
        }
    });

    // Highlights all trust boundaries on inter-trust boundary flows
    svg.selectAll(".node_group").each(function (d) {
        if (assets.some(i => i.id == d.id)) {
            d3.select(this).selectAll(".asset")
            .style("stroke", "#3E8EDE")
            .style("stroke-width", "4");
        }
    });

    // Updates bottom bar to display order of components in workflow 
    let bottom_bar_html = "<h2>"+ selectedBoundary +"</h2> <h3 style=\"font-weight:normal\">";
    for (let asset of assets) {
        bottom_bar_html += "<span style=\"cursor: pointer\" class=\"bound_asset\">" + asset.asset_name + "</span>";
        if (asset != assets[assets.length - 1]) {
            bottom_bar_html += ",  ";
        }
    }
    bottom_bar_html += "</h3> <br> <button type=\"button\" class=\"view_button\" id=\"edit_button\">Edit assets</button>";
    bottom_bar_html += "<br> <button type=\"button\" class=\"view_button\" id=\"unselect_button\">Unselect Trust Boundary</button>";
    bottom_bar_html += "<br> <button type=\"button\" class=\"view_button\" id=\"remove_boundary\">Remove Trust Boundary</button>";
    document.getElementById("bottom_bar").innerHTML = bottom_bar_html;
    document.getElementById("edit_button").onclick = function () {editBoundary(selectedBoundary)};
    var unselect_button = document.getElementById("unselect_button");
    unselect_button.onclick = function () {
        // Unselect all nodes
        for (let node of nodes) {
            node.selected = false;
        }
        d3.selectAll(".asset")
            .style("stroke", "black")
            .style("stroke-width", "1");
        resetBottomBar();
    }
    var remove_button = document.getElementById("remove_boundary");
    remove_button.onclick = function () {
        // Unselect all nodes
        for (let node of nodes) {
            node.selected = false;
        }
        d3.selectAll(".asset")
            .style("stroke", "black")
            .style("stroke-width", "1");
        svg.selectAll(".boundary").each(function(d) {
            if (selectedBoundary == d3.select(this).attr("boundaryName")) {
                d3.select(this).remove();
            }
        });
        delete boundaries[selectedBoundary];
        resetBottomBar();
    }

    // create buttons to select/view each asset in the workflow
    var spans = document.getElementsByClassName("bound_asset");
    for (let i = 0; i < assets.length; i++) {
        spans[i].onclick = function() {
            svg.selectAll(".node_group").filter(d => d === assets[i]).dispatch('click');
        };
    }
}

// Allow users to add and remove assets from a trust boundary being viewed 
// in the details bar
function editBoundary(selectedBoundary) {
    // Unselects all nodes
    d3.selectAll(".asset")
        .style("stroke", "black")
        .style("stroke-width", "1");
    // Selects and highlights the assets of the boundary being viewed
    var assets = boundaries[selectedBoundary];
    svg.selectAll(".node_group").each(function (d) {
        if (assets.includes(d)) {
            d3.select(this).selectAll(".asset")
                .style("stroke", "#3E8EDE")
                .style("stroke-width", "4");
        }
    });
    
    let bottom_bar_html = "<h2>"+ selectedBoundary +"</h2> <h3 style=\"font-weight:normal\">";
    for (let asset of assets) {
        bottom_bar_html += "<span style=\"cursor: pointer\" class=\"bound_asset\">&#10006" + asset.asset_name + ",  </span>";
    }
    bottom_bar_html += "<select class=\"add_dropdown\" id=\"add_dropdown\" disabled><option value=\"invalid\">Add more assets!</option></select><button class=\"small_button\" id=\"add_button\" disabled>+</button></h3> <br> <button type=\"button\" class=\"view_button\" id=\"done_button\">Done</button>";
    document.getElementById("bottom_bar").innerHTML = bottom_bar_html;
    
    // Check if there are assets that can be added to trust boundary
    var dropdown = document.getElementById("add_dropdown");
    if (nodes.length > boundaries[selectedBoundary].length) { 
        document.getElementById("add_button").disabled = false;
        dropdown.remove(0);
        dropdown.disabled = false;
        dropdown.selectedIndex = 0;
        dropdown.add(new Option("Select an asset...", -1));
        svg.selectAll(".node_group").filter(d => !assets.includes(d)).each(function (d, i) {
            dropdown.add(new Option(
                d3.select(this).select(".asset_label").text(),
                nodeIndex(d.id)
            ))
        });
    }

    // If there are inter-trust boundaries, retrieve jitter value, else 
    // generate a new one
    var jitter; 
    if (d3.selectAll(".boundary").filter(function() {return d3.select(this).attr("boundaryName") === selectedBoundary;}).empty()) {
        jitter = (Math.random() * 0.3) + 0.1;
    }
    else {
        jitter = d3.selectAll(".boundary").filter(function() {
            return d3.select(this).attr("boundaryName") === selectedBoundary;
        }).attr("jitter");
    }
    
    // Creating button to add assets to the trust boundary
    document.getElementById("add_button").onclick = function() {
        var selected = getDropdownValue("add_dropdown");
        if (selected == -1) {
            alert("Please select an asset to add to the trust boundary.");
            return;
        }
        var valid = false;
        for (let link of links) {
            if ((link.source == nodes[selected] && assets.includes(link.target)) || (assets.includes(link.source) && link.target == nodes[selected])) {
                valid = true;
            }
        }
        if (!valid) {
            alert("There are no dataflows connecting " + nodes[selected].asset_name + " to a node in " + selectedBoundary);
            return;
        }
        svg.selectAll(".link_group").filter(d => (d.source == nodes[selected] && assets.includes(d.target)) || (d.target == nodes[selected] && assets.includes(d.source))).selectAll(".boundary").filter(function() { return d3.select(this).attr("boundaryName") == selectedBoundary; }).remove();
        var flow = d3.selectAll(".link_group").filter(d => (d.source == nodes[selected] && !assets.includes(d.target)) || (d.target == nodes[selected] && !assets.includes(d.source)));
        assets.push(nodes[selected]);
        boundaries[selectedBoundary] = assets;
        appendTrustPath(flow, selectedBoundary, jitter);
        editBoundary(selectedBoundary);
    }

    // Making each existing component into a button to remove that 
    // component from the trust boundary
    var spans = document.getElementsByClassName("bound_asset");
    for (let i = 0; i < assets.length; i++) {
        spans[i].onclick = function() {
            var removed = assets[i];
            assets.splice(i, 1);

            if (!confirm("Remove " + removed.asset_name + " from this trust boundary?")) {
                return;
            }
            
            if (!checkConnected(assets)) {
                if (!confirm("This will delete " + selectedBoundary + " because all assets must be connected. Continue?")) {
                    return;
                }
                svg.selectAll(".boundary").each(function(d) {
                    if (selectedBoundary == d3.select(this).attr("boundaryName")) {
                        d3.select(this).remove();
                    }
                });
                delete boundaries[selectedBoundary];
                // Unselect all nodes
                for (let node of nodes) {
                    node.selected = false;
                }
                d3.selectAll(".asset")
                    .style("stroke", "black")
                    .style("stroke-width", "1");
                resetBottomBar();
                return;
            }

            svg.selectAll(".link_group").filter(d => (d.source == removed && !assets.includes(d.target)) || (d.target == removed && !assets.includes(d.source))).selectAll(".boundary").filter(function() { return d3.select(this).attr("boundaryName") == selectedBoundary; }).remove();

            var flow = d3.selectAll(".link_group").filter(d => (d.source == removed && assets.includes(d.target)) || (d.target == removed && assets.includes(d.source)));
            boundaries[selectedBoundary] = assets;
            appendTrustPath(flow, selectedBoundary, jitter);
            editBoundary(selectedBoundary);
        };
    }

    // Allow user to stop editing the workflow
    document.getElementById("done_button").onclick = function () {
        resetBottomBar();
        document.getElementById("boundary_dropdown").selectedIndex = Object.keys(boundaries).indexOf(selectedBoundary) + 1;
        viewBoundary();
    }
}

// Allow users to select assets to create a new trust boundary
function addingTrustBoundary() {
    var div = document.getElementById("adding_boundary");
    div.children[0].style.display = "block";
    div.children[1].style.display = "none";
    
    // Unselect all nodes
    for (let node of nodes) {
        node.selected = false;
    }
    d3.selectAll(".asset")
        .style("stroke", "black")
        .style("stroke-width", "1");
    resetBottomBar();
    
    // Allow selection of multiple nodes at a time
    svg.selectAll(".node_group").on("click", function(d) {
        let selected_node = d3.select(this).data()[0];
        if (selected_node.selected) {
            d3.select(this).selectAll(".asset")
            .style("stroke", "black")
            .style("stroke-width", "1");
        }
        else {
            d3.select(this).selectAll(".asset")
            .style("stroke", "#3E8EDE")
            .style("stroke-width", "4");
        }
        selected_node.selected = !selected_node.selected;
    });

    var done_button = document.createElement("button");
    done_button.innerHTML = "Done";
    done_button.classList.add("add_button");
    done_button.setAttribute("onclick", "createTrustBoundary();");
    div.appendChild(done_button);

    var cancel_button = document.createElement("button");
    cancel_button.innerHTML = "Cancel";
    cancel_button.id = "cancel_button";
    cancel_button.classList.add("add_button");
    cancel_button.setAttribute("onclick", "cancelAddingBoundary();");
    div.appendChild(cancel_button);
}

// Adds a trust boundary containing the chosen elements
function createTrustBoundary() {
    // Retrieve selected nodes
    var assets = [];
    for (let node of nodes) {
        if (node.selected) {
            assets.push(node);
        }
    }

    if (assets.length < 1) {
        alert("Please select at least one asset to create a trust boundary!");
        return;
    }
    
    if (!checkConnected(assets)) {
        alert("All assets in a trust boundary must be connected by dataflows!");
        return;
    }

    // Prevent duplicate trust boundaries
    for (let boundary of Object.values(boundaries)) {
        if (assets.length != boundary.length) {
            continue;
        }
        let check_duplicate = true;
        for (let i = 0; i < boundary.length; i++) {
            if (boundary[i] != assets[i]) {
                check_duplicate = false;
                break;
            }
        }
        if (check_duplicate) {
            alert("Cannot add a duplicate trust boundary!");
            cancelAddingBoundary();
            return;
        }
    }

    // Prompt user for trust boundary name...
    var boundary_name = window.prompt("(Optional) Name this trust boundary:", "");
    // Prevent duplicate names
    while (Object.keys(boundaries).includes(boundary_name)) {
        boundary_name = window.prompt(boundary_name + " already exists. Choose a different name:", "");
    }

    // Return from function if user cancels
    if (boundary_name === null || boundary_name === false) {
        cancelAddingBoundary();
        return;
    }
    
    // Set default boundary name if user does not name it 
    var length = Object.keys(boundaries).length + 1;
    if (boundary_name == "") {
        boundary_name = "Trust Boundary " + length;
    }
    // Prevent duplicate names
    while (Object.keys(boundaries).includes(boundary_name)) {
        length++;
        boundary_name = "Trust Boundary " + length;
    }
    boundaries[boundary_name] = assets;
    cancelAddingBoundary();
    var flow = d3.selectAll(".link_group").filter(d => (assets.includes(d.source) && !assets.includes(d.target)) || (assets.includes(d.target) && !assets.includes(d.source)));

    var jitter = (Math.random() * 0.3) + 0.1;

    appendTrustPath(flow, boundary_name, jitter);
    if (document.getElementById("boundary_dropdown")) {
        resetBottomBar();
    }
}

// Helper function to append trust boundary to flows
function appendTrustPath(flow, boundary, jitter) {
    var assets = boundaries[boundary];
    flow.append("path")
        .attr("class", "boundary")
        .attr("stroke", "red")
        .attr("stroke-dasharray", "5,5")
        .attr("stroke-width", 4)
        .attr("fill", "none")
        .attr("boundaryName", boundary)
        .attr("jitter", jitter)
        .attr("d", function(d) { return calcBoundary(d, assets, jitter)})
        .on("click", function() {
            resetBottomBar();
            document.getElementById("boundary_dropdown").selectedIndex = Object.keys(boundaries).indexOf(boundary) + 1;
            viewBoundary();
        });
}

// Helper function to check if an undirected path exists between each given 
// asset
function checkConnected(assets) {
    let queue = [assets[0]];
    let visited = [];
    while (queue.length > 0) {
        let curr = queue.pop();
        visited.push(curr);
        for (let link of links) {
            if (curr == link.source && assets.includes(link.target) && !queue.includes(link.target) && !visited.includes(link.target)) {
                queue.push(link.target);
            }
            if (curr == link.target && assets.includes(link.source) && !queue.includes(link.source) && !visited.includes(link.source)) {
                queue.push(link.source);
            }
        }
    }
    return visited.length == assets.length;
}

// Helper function to find the coordinates of the trust boundary in 
// relation to the dataflow it's being appended to
function calcBoundary(d, assets, jitter) {
    if (assets.includes(d.target)) {
        inside = d.target;
        outside = d.source;
    }
    else {
        inside = d.source;
        outside = d.target;
    }   
    
    let length = 80; 
    let x1 = inside.x;
    let y1 = inside.y;
    let x2 = outside.x;
    let y2 = outside.y;

    let midpointx = x1 + jitter * (x2 - x1);
    let midpointy = y1 + jitter * (y2 - y1);
    
    let angle = Math.atan2(y2 - y1, x2 - x1);
    let perpendicularAngle = angle + Math.PI / 2;
    
    // Compute the start and end points of the perpendicular line
    let startX = midpointx - length * Math.cos(perpendicularAngle) / 2;
    let startY = midpointy - length * Math.sin(perpendicularAngle) / 2;
    let endX = midpointx + length * Math.cos(perpendicularAngle) / 2;
    let endY = midpointy + length * Math.sin(perpendicularAngle) / 2;

    return `M${startX},${startY}L${endX},${endY}`;
}

// Cancels the process of creating a new trust boundary
function cancelAddingBoundary() {
    for (let node of nodes) {
        node.selected = false;
    }
    d3.selectAll(".asset")
    .style("stroke", "black")
    .style("stroke-width", "1");
    var div = document.getElementById("adding_boundary");
    div.removeChild(div.children[3]);
    div.removeChild(div.children[2]);
    div.children[0].style.display = "none";
    div.children[1].style.display = "block";
    svg.selectAll(".node_group").on("click", clicked);
}

// Add a threat to an existing DFD node.
function addThreat() {
    let asset = getDropdownValue("threat_dropdown");

    if (asset == -1) {
        alert("Please select an asset to add a threat to!");
        return;
    }

    let title = document.getElementById("threat_title").value
    if (title == "") {
        alert("Please add a threat title!");
        return;
    }
    let cve_num = document.getElementById("threat_number").value
    let description = document.getElementById("threat_description").value

    nodes[asset].threats[1].push({
        "threat_num": cve_num,
        "threat_title": title,
        "threat_description": description,
        "threat_status": "Known",
        "controls": [],
        "findings": null
    })

    alert("New threat (" + title + ") added to " + nodes[asset].asset_name + " successfully!");

    let textboxes = document.getElementsByClassName("threat_textbox");
    for (let textbox of textboxes) {
        textbox.value = "";
    }

    // update list in details bar
    var options = document.getElementById("options");
    if (options && options.children[0].value == nodes[asset].id) {
        nodes[asset].dispatch('click').dispatch('click');
    }
    updateThreatBadges(nodes[asset]);
}

function updateThreatBadges(asset) {
    let node = svg.selectAll(".node_group").filter(d => d.id === asset.id);
    if (asset.threats[0].length == 0) {
        node.select('.suggest_threat_badge').remove();
        node.select('.num_suggest_threats').remove();
    }
    else if (node.select('.suggest_threat_badge').empty()) {
        node.append('ellipse')
        .attr('class', 'suggest_threat_badge')
        .attr('cx', 25) 
        .attr('cy', -10) 
        .attr('rx', function(d) {
        // Calculate width based on the number of digits
            return Math.max(10 + (Math.log10(asset.threats[0].length) - 1) * 5, 10);
        })
        .attr('ry', 10)
        .style('fill', 'grey');

        node.append('text')
            .attr('class', 'num_suggest_threats')
            .attr('x', 25)  
            .attr('y', -10) 
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'central')
            .attr('fill', 'white')
            .style('font-size', '10pt') 
            .text(asset.threats[0].length);
        
    }
    else {
        node.select(".num_suggest_threats").text(asset.threats[0].length);
        node.select(".suggest_threat_badge").attr('rx', function(d) {
            return Math.max(10 + (Math.log10(asset.threats[0].length) - 1) * 5, 10);
        });
    }

    if (asset.threats[1].length == 0) {
        node.select('.known_threat_badge').remove();
        node.select('.num_known_threats').remove();
    }
    else if (node.select('.known_threat_badge').empty()) {
        node.append('ellipse')
        .attr('class', 'known_threat_badge')
        .attr('cx', 25) 
        .attr('cy', -30) 
        .attr('rx', function(d) {
        // Calculate width based on the number of digits
            return Math.max(10 + (Math.log10(asset.threats[1].length) - 1) * 5, 10);
        })
        .attr('ry', 10)
        .style('fill', 'red');

        node.append('text')
            .attr('class', 'num_known_threats')
            .attr('x', 25) 
            .attr('y', -30) 
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'central')
            .attr('fill', 'white')
            .style('font-size', '10pt') 
            .text(asset.threats[1].length);
        
    }
    else {
        node.select(".num_known_threats").text(asset.threats[1].length);
        node.select(".known_threat_badge").attr('rx', function(d) {
            return Math.max(10 + (Math.log10(asset.threats[1].length) - 1) * 5, 10);
        });
    }
}

// Add a control to an existing DFD node.
// TODO: maybe merge this with addThreat()?
function addControl() {
    let asset = getDropdownValue("control_dropdown");

    if (asset == -1) {
        alert("Please select an asset to add a control to!");
        return;
    }

    let title = document.getElementById("control_title").value
    if (title == "") {
        alert("Please add a control title!");
        return;
    }
    let description = document.getElementById("control_description").value

    nodes[asset].controls.push({
        "control_title": title,
        "control_description": description,
        "control_status": "Known",
        "threats": []
    })

    alert("New control (" + title + ") added to " + nodes[asset].asset_name + " successfully!");

    let textboxes = document.getElementsByClassName("controls_textbox");
    for (let textbox of textboxes) {
        textbox.value = "";
    }

    // update list in details bar
    var options = document.getElementById("options");
    if (options && options.children[0].value == nodes[asset].id) {
        svg.selectAll(".node_group").filter(d => d.id === nodes[asset].id).dispatch('click').dispatch('click');
    }
}

// Gets values from radio buttons
// Returns null if no value is selected (which throws an error later)
function getTechImpactValue(impact_name) {
    let query = "input[name=\"radio_" + impact_name + "\"]:checked";
    let selection = document.querySelector(query);
    if (selection == null) {
        return null;
    }
    else {
        return selection.value;
    }
}

// Save any info filled into a findings page.
function saveFinding() {
    let assessor_textbox = document.getElementById("assessor_textbox");

    if (assessor_textbox.value == "") {
        alert("Please add the name of the assessor(s) for this finding!");
        return;
    }

    let technical_impact = [
        getTechImpactValue("confidentiality"),
        getTechImpactValue("integrity"),
        getTechImpactValue("availability"),
        getTechImpactValue("authenticity"),
        getTechImpactValue("nonrepudiation"),
        getTechImpactValue("authorization"),
    ];
    for (let impact of technical_impact) {
        if (impact == null) {
            alert("Please set a technical impact level for each field!");
            return;
        }
    }

    let asset_index = getDropdownValue("findings_asset_dropdown");
    let threat_index = getDropdownValue("findings_threats_dropdown");

    let notes_textbox = document.getElementById("notes_textbox");
    var checked_boxes = document.querySelectorAll('input[name=control_checkbox]:checked');

    let findings = {
        "status": getDropdownValue("status_dropdown"),
        "controls": checked_boxes,
        "technical_impact": {
            "confidentiality": technical_impact[0],
            "integrity": technical_impact[1],
            "availability": technical_impact[2],
            "authenticity": technical_impact[3],
            "nonrepudiation": technical_impact[4],
            "authorization": technical_impact[5],
        },
        "harm": getDropdownValue("harm_dropdown"),
        "exploitability": getDropdownValue("exploitability_dropdown"),
        "assessor": assessor_textbox.value,
        "assessment_date": new Date(),
        "notes": notes_textbox.value,
    }

    nodes[asset_index].threats[threat_index].findings = findings
    console.log(nodes[asset_index].threats[threat_index].findings)

    alert("Findings saved!");
}

// TODO
// Findings tab:
// -- Pick an asset from a dropdown
// -- Pick a threat on that asset from a dropdown
//
// -- See a list of checkboxes for all controls on that asset,
//    with the ability to check which ones are mitigating that threat
// -- Relevant? toggle
// -- Technical impact section: One line per factor
//    (confidentiality, integrity, availability, authenticity,
//    non-repudiation, authorization)
//    Each of these is set by user to None/Low/High (default None)
// -- Safety impact section: One line per factor
//    Harm: Unset/Negligible/Minor/Serious/Critical/Catastrophic
//        (default Unset)
//    Exploitability: Unknown/Low/Medium/High
//        (default Unknown)
//    Assessment Time: (autopopulated with current time)
//    Assessed By: User can input their name
// -- Additional Notes: User can add any other notes
// -- User should be able to mark a finding as completed once they have
//    been properly filled in (or un-mark completed if they think
//    something needs to be changed)
//
// -- List of threats should be color-coded based on the status of their
//    associated findings...:
//    Red - Finding has been generated; is not complete
//    Orange - Finding has been generated; some data is saved, not marked
//        as complete
//    Black - Finding is marked as complete
//    Grey - Finding is marked as not relevant


