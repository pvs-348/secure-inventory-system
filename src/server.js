const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/src", express.static(__dirname));

app.get("/", (req, res) => {
  res.redirect("/home.html");
});

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

function getFilePath(node) {
  return path.join(DATA_DIR, `Warehouse${node}.json`);
}

function readWarehouse(node) {
  const file = getFilePath(node);

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]");
  }

  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeWarehouse(node, records) {
  fs.writeFileSync(getFilePath(node), JSON.stringify(records, null, 2));
}

app.post("/store-record", (req, res) => {
  const { record } = req.body;

  if (!record || !record.itemId || !record.itemQty || !record.itemPrice || !record.location) {
    return res.status(400).json({
      success: false,
      error: "Invalid or missing record received by server."
    });
  }

  ["A", "B", "C", "D"].forEach(node => {
    const records = readWarehouse(node);
    records.push(record);
    writeWarehouse(node, records);
  });

  res.json({ success: true });
});

app.get("/storage", (req, res) => {
  res.json({
    A: readWarehouse("A"),
    B: readWarehouse("B"),
    C: readWarehouse("C"),
    D: readWarehouse("D")
  });
});

app.post("/clear-storage", (req, res) => {
  ["A", "B", "C", "D"].forEach(node => {
    writeWarehouse(node, []);
  });

  res.json({ success: true });
});

app.get("/query-item", (req, res) => {
  const { itemId } = req.query;

  if (!itemId) {
    return res.status(400).json({
      success: false,
      error: "itemId query parameter is required. Example: /query-item?itemId=001"
    });
  }

  const result = {};

  ["A", "B", "C", "D"].forEach(node => {
    const records = readWarehouse(node);
    const found = records.find(r => r.itemId === itemId);
    result[node] = found || null;
  });

  res.json(result);
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

