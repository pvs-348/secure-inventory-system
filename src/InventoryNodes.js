export class InventoryNode {
    constructor(name, keys) {
        this.name = name;
        this.keys = keys; // {p, q, e, d, n}
        this.records = []; // local storage
    }

    verifySignature(record, signature, utils) {
        // call your RSA verify function
        return utils.verifySignature(record, signature, this.keys);
    }

    validateRecord(record) {
        // basic sanity checks (keep simple but present)
        if (!record) return false;
        if (!record.itemID || !record.qty || !record.location) return false;
        return true;
    }

    vote(record, signature, utils) {
        const sigValid = this.verifySignature(record, signature, utils);
        const dataValid = this.validateRecord(record);

        return (sigValid && dataValid) ? "ACCEPT" : "REJECT";
    }

    storeRecord(record) {
        this.records.push(record);
    }

    getRecords() {
        return this.records;
    }
}