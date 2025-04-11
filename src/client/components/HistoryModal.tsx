import { type RefObject, useEffect, useRef, useState } from "hono/jsx";
import type { JSX } from "hono/jsx/jsx-runtime";
import type { TrackEditSb } from "../../packets/serverbound";
import type MapState from "../state/MapState";

function readableTimestamp(date: Date, now: Date): string {
	const ms = now.getTime() - date.getTime();
	const s = Math.floor(ms / 1000);
	if (s < 0) {
		throw new Error("readableTimestamp: seconds cannot be negative");
	}
	if (s === 0) {
		return "now";
	}
	if (s === 1) {
		return "1 second ago";
	}
	if (s < 60) {
		return `${s} seconds ago`;
	}
	const min = Math.floor(s / 60);
	if (min === 1) {
		return "1 minute ago";
	}
	if (min < 60) {
		return `${min} minutes ago`;
	}
	const hr = Math.floor(min / 60);
	if (hr === 1) {
		return "1 hour ago";
	}
	if (hr < 24) {
		return `${hr} hours ago`;
	}
	const day = Math.floor(hr / 24);
	if (day === 1) {
		return "1 day ago";
	}
	if (day < 30) {
		return `${day} days ago`;
	}
	const month = Math.floor(day / 30);
	if (month === 1) {
		return "1 month ago";
	}
	if (month < 12) {
		return `${month} months ago`;
	}
	const year = Math.floor(month / 12);
	if (year === 1) {
		return "1 year ago";
	}
	return `${year} years ago`;
}

function editTreeToElementArray(
	closeDialog: () => void,
	mapState: MapState,
): JSX.Element[] {
	const edits = mapState.epanetState.editTree.edits.values().toArray();
	edits.sort((a, b) => {
		if (a.edit_id < b.edit_id) {
			return -1;
		}
		if (a.edit_id > b.edit_id) {
			return 1;
		}
		return 0;
	});
	edits.reverse();
	const now = new Date();
	const items = edits.map((edit) => {
		return (
			<tr key={edit.edit_id}>
				<td>{readableTimestamp(edit.created_at, now)}</td>
				<td>
					<button
						type="button"
						onClick={async () => {
							const toSend: TrackEditSb = {
								type: "track_edit_sb",
								edit_id: edit.edit_id,
							};
							mapState.epanetState.applyLocalAndSend(toSend);
							closeDialog();
						}}
					>
						{edit.action.type}
					</button>
				</td>
			</tr>
		);
	});
	return items;
}

export default function HistoryModal({
	open,
	setOpen,
	mapState,
}: { open: boolean; setOpen: (value: boolean) => void; mapState: MapState }) {
	const dialogRef: RefObject<HTMLDialogElement | null> = useRef(null);
	const [listItems, setListItems] = useState<JSX.Element[]>(
		editTreeToElementArray(() => setOpen(false), mapState),
	);
	useEffect(() => {
		mapState.subscribeAfterLoad((p) => {
			// console.log(p);
			if (p.type === "epanet_edit_cb" || p.type === "track_edit_cb") {
				setListItems(
					editTreeToElementArray(() => {
						setOpen(false);
					}, mapState),
				);
			}
		});
		return () => {};
	}, []);
	return (
		<div>
			<button
				type="button"
				onClick={() => {
					dialogRef.current?.showModal();
					setOpen(false);
				}}
			>
				History
			</button>
			<dialog class="history-dialog" ref={dialogRef}>
				<table>
					<tr>
						<th>Timestamp</th>
						<th>Action</th>
					</tr>
					{listItems}
				</table>
				<button
					type="button"
					onClick={() => {
						dialogRef.current?.close();
						setOpen(false);
					}}
				>
					Close
				</button>
			</dialog>
		</div>
	);
}
