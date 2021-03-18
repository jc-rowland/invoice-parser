const { Parser } = require("json2csv");

module.exports = class Table {
  static parserOps = {
    fields: [
        "Date",
      "Source",
      "Returned",
      "Order Number",
      "Items ordered",
      "Quantity",
      "For",
      "IT Received By",
      "Cost",
      "Billing Frequency",
      "Tracking Number",
    ],
  };
  static parser = new Parser(Table.parserOps);

  constructor() {
    this.table = [];
  }

  insert({ date, source, orderNum, itemDesc, qty, cost, trackingNum }) {
    this.table.push({
      Date: date,
      Source: source,
      Returned: "",
      "Order Number": orderNum,
      "Items ordered": itemDesc,
      Quantity: parseInt(qty),
      For: "",
      "IT Received By": "",
      Cost: cost,
      "Billing Frequency": "",
      "Tracking Number": trackingNum || "",
    });
  }
  get csv() {
    return Table.parser.parse(this.table);
  }
};
