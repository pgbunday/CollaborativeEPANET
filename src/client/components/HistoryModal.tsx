import { useEffect, useRef, useState, type RefObject } from "hono/jsx";
import type { JSX } from "hono/jsx/jsx-runtime";
import type MapState from "../state/MapState";
import type { TrackEditSb } from "../../packets/serverbound";

function readableTimestamp(date: Date, now: Date): string {
    const ms = now.getTime() - date.getTime();
    const s = Math.floor(ms / 1000);
    if (s < 0) {
        throw new Error('readableTimestamp: seconds cannot be negative');
    } else if (s == 0) {
        return 'now';
    } else if (s == 1) {
        return '1 second ago';
    } else if (s < 60) {
        return '' + s + ' seconds ago';
    }
    const min = Math.floor(s / 60);
    if (min == 1) {
        return '1 minute ago';
    } else if (min < 60) {
        return '' + min + ' minutes ago';
    }
    const hr = Math.floor(min / 60);
    if (hr == 1) {
        return '1 hour ago';
    } else if (hr < 24) {
        return '' + hr + ' hours ago';
    }
    const day = Math.floor(hr / 24);
    if (day == 1) {
        return '1 day ago';
    } else if (day < 30) {
        return '' + day + ' days ago';
    }
    const month = Math.floor(day / 30);
    if (month == 1) {
        return '1 month ago';
    } else if (month < 12) {
        return '' + month + ' months ago';
    }
    const year = Math.floor(month / 12);
    if (year == 1) {
        return '1 year ago';
    } else {
        return '' + year + ' years ago';
    }
}

function editTreeToElementArray(closeDialog: () => void, mapState: MapState): JSX.Element[] {
    const edits = mapState.epanetState.editTree.edits.values().toArray();
    edits.sort((a, b) => {
        if (a.edit_id < b.edit_id) {
            return -1;
        } else if (a.edit_id > b.edit_id) {
            return 1;
        } else {
            return 0;
        }
    });
    edits.reverse();
    const now = new Date();
    const items = edits.map(edit => {
        return <tr key={edit.edit_id}>
            <td>{readableTimestamp(edit.created_at, now)}</td>
            <td><button onClick={async () => {
                const toSend: TrackEditSb = {
                    type: "track_edit_sb",
                    edit_id: edit.edit_id,
                };
                mapState.epanetState.applyLocalAndSend(toSend);
                closeDialog();
            }}>{edit.action.type}</button></td>
        </tr>
    });
    return items;
}

export default function HistoryModal({ open, setOpen, mapState }: { open: boolean, setOpen: (value: boolean) => void, mapState: MapState }) {
    const dialogRef: RefObject<HTMLDialogElement | null> = useRef(null);
    const [listItems, setListItems] = useState<JSX.Element[]>(editTreeToElementArray(() => setOpen(false), mapState));
    useEffect(() => {
        mapState.subscribeAfterLoad((p) => {
            console.log(p);
            if (p.type == "epanet_action_cb" || p.type == "track_edit_cb") {
                setListItems(editTreeToElementArray(() => { dialogRef.current?.close(); setOpen(false) }, mapState));
            }
        });
        return () => { }
    }, [listItems]);
    return (
        <div>
            <button onClick={() => { dialogRef.current?.showModal(); setOpen(false); }}>History</button>
            <dialog class="history-dialog" ref={dialogRef} onTouchCancel={() => {
                console.log('touch cancel');
            }} onCancel={() => { console.log('cancel') }} onClose={() => { console.log('close') }}>
                <table>
                    <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                    </tr>
                    {listItems}
                </table>
                {/* <ul>{listItems}</ul> */}
                <button onClick={() => { dialogRef.current?.close(); setOpen(false) }}>Close</button>
            </dialog>
        </div>
    )
}