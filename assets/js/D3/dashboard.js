
const root = document.getElementById("#dashboard-vmap");
const tooltip = document.createElement("div");
tooltip.setAttribute("id", "tooltip");
tooltip.setAttribute("data-year", 0);
root.appendChild(tooltip);

const w = 1000;
const h = 700;
const padding = 100;

const svg = d3.select("#root")
    .append("svg")
    .attr("width", w)
    .attr("height", h);

// Fill SVG chart with data in the form of a bar chart
let promise1 = new Promise((resolve, reject) => {
    let req = new XMLHttpRequest();
    req.open("GET", "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/counties.json");
    req.send();
    req.onload = () => resolve(JSON.parse(req.responseText));
});

let promise2 = new Promise((resolve, reject) => {
    let req = new XMLHttpRequest();
    req.open("GET", "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/for_user_education.json");
    req.send();
    req.onload = () => resolve(JSON.parse(req.responseText));
});

Promise.all([promise1, promise2]).then(values => {
    let topology = values[0];
    let countyData = values[1];
    let svgScale = topology.transform.scale;
    let arcs = topology.arcs;

    svg.append("text")
        .attr("id", "title")
        .attr("x", w / 2)
        .attr("y", padding / 3)
        .attr("font-size", "3em")
        .attr("text-anchor", "middle")
        .text("Choropleth Map")

    svg.append("text")
        .attr("id", "description")
        .attr("x", w / 2)
        .attr("y", padding * 2 / 3)
        .attr("text-anchor", "middle")
        .text("Percentage of people with a bachelors or higher")

    let legend_w = 240;
    let legend_h = 30;
    let hsl_min = 0;
    let hsl_max = 149
    let pct_min = 0;
    let pct_max = 80;
    let n_step = 10;
    let COLORS = [];
    for (let i = 0; i < n_step; i++) {
        COLORS.push({
            color: `hsl(${(hsl_max - hsl_min) / n_step * i}, 86%, 74%)`,
            inRange: (x) =>
                i * (pct_max - pct_min) / n_step <= x &&
                x < (i + 1) * (pct_max - pct_min) / n_step,
            text: `${i * (pct_max - pct_min) / n_step}%`
        });
    }
    let legend = svg.append("g")
        .attr("id", "legend")
        .attr("transform", `translate(${500},${100})`);
    legend.selectAll("rect")
        .exit()
        .data(COLORS)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * legend_w / n_step)
        .attr("y", 0)
        .attr("width", legend_w / n_step)
        .attr("height", legend_h / 3)
        .attr("fill", (d, i) => d.color)

    legend.selectAll("line")
        .exit()
        .data(COLORS)
        .enter()
        .append("line")
        .attr("x1", (d, i) => i * legend_w / n_step)
        .attr("y1", 0)
        .attr("x2", (d, i) => i * legend_w / n_step)
        .attr("y2", legend_h * 1.5 / 3)
        .attr("stroke", "black")
        .attr("stroke-width", "1px")

    legend.selectAll("text")
        .exit()
        .data(COLORS)
        .enter()
        .append("text")
        .attr("x", 100)
        .attr("y", 100)
        .attr("x", (d, i) => i * legend_w / n_step)
        .attr("y", legend_h * 2.5 / 3)
        .attr("text-anchor", "middle")
        .attr("justify-content", "space-around")
        .attr("font-size", "0.69em")
        .text(d => d.text)


    const arcArrayToPath = (A) => {
        let d = ["M"];
        let i = A[0];
        if (i < 0) {
            let a = arcs[~i];
            let x = a[0][0];
            let y = a[0][1];
            for (let k = 1; k < a.length; k++) {
                x += a[k][0];
                y += a[k][1];
            }
            d.push(x + "," + y);
        } else {
            d.push(arcs[i][0][0] + "," + arcs[i][0][1]);
        }
        d.push("m");

        for (let i of A) {
            if (i < 0) {
                let a = arcs[~i];
                for (let k = a.length - 1; k > 0; k--) {
                    d.push(-a[k][0] + "," + -a[k][1]);
                }
            } else {
                d.push(...arcs[i].slice(1).map(p => p.join(",")));
            }
        }
        d.push("z")
        return d.join(" ");
    };

    const polygonToPath = (P) => {
        let d = [];
        for (let A of P) {
            d.push(arcArrayToPath(A));
        }
        return d.join(" ");
    };
    let countyGeometries = topology.objects.counties.geometries;
    let N_COUNTIES = countyData.length;
    for (let i = 0; i < N_COUNTIES; i++) {
        let geom = countyGeometries[i];
        let data = countyData[i];

        let g = svg.append("g")
            .classed("county", true)
            .attr("fill", () => { // EHHH
                return COLORS.filter(x => x.inRange(data.bachelorsOrHigher))[0].color;
            })
            .attr("transform", `translate(0,${padding}) scale(${svgScale.join(", ")})`)
            .attr("data-fips", data.fips)
            .attr("state", data.state)
            .attr("area-name", data.area_name)
            .attr("data-education", data.bachelorsOrHigher)
            .on("mouseover", (d, i, node) => {
                tooltip.style.visibility = "visible";

                tooltip.setAttribute("data-education", data.bachelorsOrHigher);  // Ugh?
                let bbox = node[0].getBBox();
                let tx = (bbox.x + bbox.width / 2) * svgScale[0];
                let ty = (bbox.y + bbox.height / 2) * svgScale[1];
                tooltip.style.transform = `translate(${tx + 15}px, ${ty + padding}px)`;

                let lines = [
                    `${data.area_name}, ${data.state}`,
                    `${data.bachelorsOrHigher}%`
                ];
                tooltip.innerHTML = lines.join("<br>");
            })
            .on("mouseout", (d) => {
                tooltip.style.visibility = "invisible";
            });

        if (geom.type == "Polygon") {
            g.append("path").attr("d", polygonToPath(geom.arcs));
        } else if (geom.type === "MultiPolygon") {
            for (let poly of geom.arcs) {
                g.append("path").attr("d", polygonToPath(poly));
            }
        }
    }


    let statesGeometries = topology.objects.states.geometries;
    let N_STATES = statesGeometries.length;
    for (let i = 0; i < N_STATES; i++) {
        let g = svg.append("g")
            .classed("state", true)
            .attr("transform", `translate(0,${padding}) scale(${svgScale.join(", ")})`);

        for (let poly of statesGeometries[i].arcs) {
            g.append("path")
                .attr("fill", "none")
                .attr("stroke", "white")
                .attr("stroke-width", "5em")
                .attr("d", polygonToPath(poly));
        }
    }

});


Resources1× 0.5× 0.25×Rerun