<script lang="ts">
	import { encodeData, decodeData, type TimetableData, type Lesson } from '$lib/utils';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let timetable: TimetableData = {};
	let icalUrl = '';

	const days = ['月', '火', '水', '木', '金'];
	const periods = [1, 2, 3, 4, 5];

	let calTitle = '時間割';
	let startDate = '2025-10-01';
	let endDate = '2025-12-31';
	let periodTimes = {
		'1': '09:00',
		'2': '10:40',
		'3': '13:00',
		'4': '14:40',
		'5': '16:20'
	};
	let periodDuration = 90;

	onMount(() => {
		const dataParam = $page.url.searchParams.get('data');
		if (dataParam) {
			const decodedTimetable = decodeData(dataParam);
			if (decodedTimetable) {
				timetable = decodedTimetable;
			}
		}

		const titleParam = $page.url.searchParams.get('title');
		if (titleParam) calTitle = titleParam;

		const startParam = $page.url.searchParams.get('start');
		if (startParam) startDate = startParam;

		const endParam = $page.url.searchParams.get('end');
		if (endParam) endDate = endParam;

		const timesParam = $page.url.searchParams.get('times');
		if (timesParam) {
			try {
				periodTimes = JSON.parse(timesParam);
			} catch (e) {
				console.error('Failed to parse times', e);
			}
		}

		const durationParam = $page.url.searchParams.get('duration');
		if (durationParam) {
			const parsed = parseInt(durationParam, 10);
			if (!isNaN(parsed)) periodDuration = parsed;
		}
	});

	let isModalOpen = false;
	let editingKey = ''; // 現在編集中のキー ("月_1" など)

	let editForm: Lesson = { name: '', room: '', teacher: '' };

	// セルをクリックしたときの処理
	const openModal = (day: string, period: number) => {
		editingKey = `${day}_${period}`;
		// 既存のデータがあればコピー
		editForm = timetable[editingKey]
			? { ...timetable[editingKey] }
			: { name: '', room: '', teacher: '' };
		isModalOpen = true;
	};

	// 保存処理
	const saveModal = () => {
		if (editForm.name || editForm.room || editForm.teacher) {
			timetable[editingKey] = { ...editForm };
		} else {
			// 全て空なら削除
			delete timetable[editingKey];
			timetable = timetable;
		}
		closeModal();
	};

	// 閉じる処理
	const closeModal = () => {
		isModalOpen = false;
	};

	// URL 生成
	$: {
		const encoded = encodeData(timetable);
		if ($page.url) {
			const params = new URLSearchParams({
				data: encoded,
				title: calTitle,
				start: startDate,
				end: endDate,
				times: JSON.stringify(periodTimes),
				duration: periodDuration.toString()
			});
			icalUrl = `${$page.url.origin}/ical?${params.toString()}`;

			// ブラウザの URL を動的に更新（履歴に追加せず置き換え）
			const newUrl = `${$page.url.pathname}?${params.toString()}`;
			if (typeof window !== 'undefined' && window.history) {
				window.history.replaceState({}, '', newUrl);
			}
		}
	}

	const copyToClipboard = () => {
		navigator.clipboard.writeText(icalUrl);
	};
</script>

<div class="container">
	<h1>Classify</h1>
	<p>
		iCal 形式で時間割を作成します。<br
		/>完成した時間割をブックマークすると、変更があった時に再度そこから編集することができます。<br
		/>編集した時間割は再度ブックマークし直してください。
	</p>
	<div class="preferences">
		<div class="preference">
			<label for="cal-title">カレンダー名</label>
			<input type="text" name="cal-title" placeholder="カレンダー名を入力" bind:value={calTitle} />
		</div>
		<div class="preference">
			<label for="cal-start-date">開始日</label>
			<input type="date" name="cal-start-date" bind:value={startDate} />
		</div>
		<div class="preference">
			<label for="cal-stop-date">終了日</label>
			<input type="date" name="cal-stop-date" bind:value={endDate} />
		</div>
		<details>
			<summary>時間割開始・終了時刻の設定</summary>
			<div class="preference">
				<label for="period-1-time">１限開始時刻</label>
				<input type="time" name="period-1-time" bind:value={periodTimes['1']} />
			</div>
			<div class="preference">
				<label for="period-2-time">２限開始時刻</label>
				<input type="time" name="period-2-time" bind:value={periodTimes['2']} />
			</div>
			<div class="preference">
				<label for="period-3-time">３限開始時刻</label>
				<input type="time" name="period-3-time" bind:value={periodTimes['3']} />
			</div>
			<div class="preference">
				<label for="period-4-time">４限開始時刻</label>
				<input type="time" name="period-4-time" bind:value={periodTimes['4']} />
			</div>
			<div class="preference">
				<label for="period-5-time">５限開始時刻</label>
				<input type="time" name="period-5-time" bind:value={periodTimes['5']} />
			</div>
			<div class="preference">
				<label for="period-duration">各時限の時間 (分)</label>
				<input
					type="number"
					name="period-duration"
					min="30"
					max="180"
					bind:value={periodDuration}
				/>
			</div>
		</details>
	</div>
	<div class="grid">
		<div class="header"></div>
		{#each days as day}
			<div class="header">{day}</div>
		{/each}

		{#each periods as period}
			<div class="period-label">{period}限</div>
			{#each days as day}
				{@const key = `${day}_${period}`}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="cell" on:click={() => openModal(day, period)}>
					{#if timetable[key]}
						<div class="cell-content">
							<span class="subject">{timetable[key].name}</span>
							{#if timetable[key].room}
								<span class="room">@{timetable[key].room}</span>
							{/if}
						</div>
					{:else}
						<span class="placeholder">+</span>
					{/if}
				</div>
			{/each}
		{/each}
	</div>

	<div class="download-area">
		<h3>ダウンロード</h3>
		<p>
			自分のスケジュールとして新規追加したいとき、こちらを選択してください。<br />
			Classify の仕様には追従しません
		</p>
		<a href={icalUrl} download={`${calTitle}.ics`}><button>ダウンロード</button></a>
	</div>

	<div class="result-area">
		<h3>iCal URL (購読 URL 用)</h3>
		<p>
			購読 URL では予定を変更することができません。<br />
			また、Classify の仕様変更に伴って、授業の表示の表記や情報が変更される場合があります
		</p>
		<p class="url-box">{icalUrl}</p>
		<button on:click={copyToClipboard}>Copy URL</button>
	</div>

	<h3>その他</h3>
	<a href="https://github.com/m-tsuru/classify">GitHub</a> /
	<a href="https://twitter.com/m__tsuru">X</a>
</div>

{#if isModalOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" on:click={closeModal}>
		<div class="modal-content" on:click|stopPropagation>
			<h2>編集: {editingKey.replace('_', '曜 ')}限</h2>

			<div class="form-group">
				<label for="lecture-name">講義名</label>
				<input
					type="text"
					name="lecture-name"
					bind:value={editForm.name}
					placeholder="例: 英語応用演習Ⅰ"
				/>
			</div>

			<div class="form-group">
				<label for="lecture-room">場所 (教室)</label>
				<input
					type="text"
					name="lecture-room"
					bind:value={editForm.room}
					placeholder="例: LL403A"
				/>
			</div>

			<div class="form-group">
				<label for="lecture-teacher">教員名</label>
				<input
					type="text"
					name="lecture-teacher"
					bind:value={editForm.teacher}
					placeholder="例: ドナルド・トランプ"
				/>
			</div>

			<div class="modal-actions">
				<button class="cancel" on:click={closeModal}>キャンセル</button>
				<button class="save" on:click={saveModal}>決定</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		font-family: sans-serif;
	}

	/* Grid Styling */
	.grid {
		display: grid;
		grid-template-columns: 40px repeat(5, 1fr);
		gap: 4px;
		margin-bottom: 20px;
	}
	.header {
		font-weight: bold;
		text-align: center;
		padding: 5px;
	}
	.period-label {
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
	}

	.cell {
		border: 1px solid #ccc;
		border-radius: 4px;
		min-height: 80px;
		background: #fff;
		cursor: pointer;
		padding: 5px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}
	.cell:hover {
		background: #f9f9f9;
		border-color: #999;
	}

	.cell-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 0.9rem;
	}
	.subject {
		font-weight: bold;
		color: #333;
	}
	.room {
		font-size: 0.8rem;
		color: #666;
		background: #eee;
		padding: 1px 4px;
		border-radius: 3px;
	}
	.placeholder {
		color: #ddd;
		font-size: 1.5rem;
	}

	.url-box {
		background: #f0f0f0;
		padding: 10px;
		word-break: break-all;
		font-family: monospace;
		font-size: 0.8em;
	}

	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}
	.modal-content {
		background: white;
		padding: 20px;
		border-radius: 8px;
		width: 90%;
		max-width: 400px;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
	}
	.form-group {
		margin-bottom: 15px;
	}
	.form-group label {
		display: block;
		margin-bottom: 5px;
		font-weight: bold;
		font-size: 0.9rem;
	}
	.form-group input {
		width: 100%;
		padding: 8px;
		box-sizing: border-box;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.preferences {
		margin-top: 20px;
		margin-bottom: 20px;
	}

	.preference {
		margin-top: 10px;
		margin-bottom: 10px;
	}

	.preference label {
		display: block;
		margin-bottom: 5px;
		font-weight: bold;
	}

	.preference input {
		width: 100%;
		padding: 8px;
		box-sizing: border-box;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 20px;
	}
	button {
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	.save {
		background: #0070f3;
		color: white;
	}
	.cancel {
		background: #eee;
		color: #333;
	}
</style>
