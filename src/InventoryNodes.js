class InventoryNode {
    constructor(name) {
        this.name = name;
        this.rsa = deriveRSAKeys(name);
        this.records = [];
    }

    verifyRecordSignature(record, signature, originNode) {
        const message = recordToMessage(record);
        const hash = textToBigIntHash(message);

        const result = verifySignature(
            originNode,
            message,
            hash,
            signature
        );

        return result.isValid;
    }

    validateRecord(record) {
        if (!record.itemId || !record.itemQty || !record.itemPrice || !record.location) {
            return false;
        }

        if (Number(record.itemQty) <= 0 || Number(record.itemPrice) <= 0) {
            return false;
        }

        return true;
    }

    vote(record, signature, originNode) {
        const sigValid = this.verifyRecordSignature(record, signature, originNode);
        const dataValid = this.validateRecord(record);

        return sigValid && dataValid ? "ACCEPT" : "REJECT";
    }

    storeRecord(record) {
        this.records.push(record);
    }

    getRecords() {
        return this.records;
    }
}