// edits.ts: grouping similar code for edits that may not be exclusive to the
// server or the client

import type { EpanetEdit } from "../packets/clientbound.js";
import type { EpanetAction } from "../packets/common.js";
import type { DbProjectEditSchema, DbProjectSnapshotSchema } from "../server/db_project.js";

export class EditTree {
    // children maps from node index to all its children
    public readonly children: Map<number, number[]>
    // parents maps from node index to its single parent
    public readonly parents: Map<number, number>
    public readonly edits: Map<number, EpanetEdit>

    constructor() {
        this.children = new Map();
        this.parents = new Map();
        this.edits = new Map();
    }

    // Creates a new reference with new maps, where the EpanetEdit objects are
    // the same
    shallowCopy(): EditTree {
        const tree = new EditTree();
        for (const [_, edit] of this.edits) {
            tree.addNode(edit);
        }
        return tree;
    }

    addNode(edit: EpanetEdit) {
        if (edit.parent_id == edit.edit_id) {
            // node is its own parent, so a root node
            this.children.set(edit.edit_id, []);
            this.parents.set(edit.edit_id, edit.edit_id);
        } else {
            const maybeSiblings = this.children.get(edit.parent_id);
            if (maybeSiblings) {
                // Add the edit as a sibling
                maybeSiblings.push(edit.edit_id);
                this.children.set(edit.parent_id, maybeSiblings);
                // Make sure the edit can have children
                this.children.set(edit.edit_id, []);
                // Add the ability to traverse up the tree
                this.parents.set(edit.edit_id, edit.parent_id);
                // And finally, store the edit data
                this.edits.set(edit.edit_id, edit);
            } else {
                // unknown parent ID: there's a problem somewhere. Try to continue but
                // with a stern log
                this.children.set(edit.parent_id, [edit.edit_id]);
                this.children.set(edit.edit_id, []);
                this.parents.set(edit.edit_id, edit.parent_id);
                this.edits.set(edit.edit_id, edit);
                if (edit.parent_id != 0) {
                    console.error('EditTree addNode error, no existing parent for edit:', edit);
                }
            }
        }
    }

    getChronologicalWithLastChild(lastChildId: number): EpanetEdit[] {
        const reverseChronological: EpanetEdit[] = [];
        let currentEditId: number | undefined = lastChildId;
        while (currentEditId != undefined && this.parents.get(currentEditId) != undefined && this.parents.get(currentEditId) != currentEditId) {
            reverseChronological.push(this.edits.get(currentEditId)!);
            currentEditId = this.parents.get(currentEditId);
        }
        // reverse.reverse() -> regular chronological return
        return reverseChronological.reverse();

    }
}
