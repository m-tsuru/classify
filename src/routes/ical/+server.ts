import { decodeData, type TimetableData } from '$lib/utils';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const dataParam = url.searchParams.get('data');
	if (!dataParam) return new Response('Error: No data', { status: 400 });

	const timetable = decodeData(dataParam);
    if (!timetable) return new Response('Error: Invalid data', { status: 400 });

	// URL パラメータから設定を取得
	const calTitle = url.searchParams.get('title') || '大学の時間割';
	const startDateStr = url.searchParams.get('start') || '2025-04-07';
	const endDateStr = url.searchParams.get('end') || '2025-07-31';
	const timesParam = url.searchParams.get('times');
	const durationParam = url.searchParams.get('duration');

	// 時限情報のパース
	let timeMap: Record<string, {h: number, m: number}> = {
		'1': { h: 9, m: 0 },
		'2': { h: 10, m: 40 },
		'3': { h: 13, m: 0 },
		'4': { h: 14, m: 40 },
		'5': { h: 16, m: 20 },
	};

	if (timesParam) {
		try {
			const times = JSON.parse(timesParam);
			for (const [period, time] of Object.entries(times)) {
				const [h, m] = (time as string).split(':').map(Number);
				timeMap[period] = { h, m };
			}
		} catch (e) {
			console.error('Failed to parse times', e);
		}
	}

	const duration = durationParam ? parseInt(durationParam, 10) : 90;

	// 日付のパース
	const semesterStart = new Date(startDateStr + 'T00:00:00+09:00');
	const endDate = new Date(endDateStr + 'T23:59:59+09:00');
	const semesterEnd = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

	// iCal ヘッダー
	let icalContent = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//My Timetable App//JA',
		`X-WR-CALNAME:${calTitle}`,
		'X-WR-TIMEZONE:Asia/Tokyo',
        'BEGIN:VTIMEZONE',
        'TZID:Asia/Tokyo',
        'BEGIN:STANDARD',
        'DTSTART:19700101T000000',
        'TZOFFSETFROM:+0900',
        'TZOFFSETTO:+0900',
        'TZNAME:JST',
        'END:STANDARD',
        'END:VTIMEZONE'
	];

    const dayOffset: Record<string, number> = { '月': 0, '火': 1, '水': 2, '木': 3, '金': 4 };

	// 登録データ読み込み
	for (const [key, lesson] of Object.entries(timetable)) {
		if (!lesson || !lesson.name) continue;

		const [dayStr, periodStr] = key.split('_');
        const targetDayOfWeek = dayOffset[dayStr];
        const time = timeMap[periodStr];

        if (targetDayOfWeek === undefined || !time) continue;

        // 開始日の曜日を取得 (0=日, 1=月, ..., 6=土)
        const startDayOfWeek = semesterStart.getDay();

        // 目標の曜日に調整 (月曜=1, 火曜=2, ..., 金曜=5)
        const targetDayOfWeekJS = targetDayOfWeek + 1; // JSの曜日形式に変換

        // 開始日から目標曜日までの日数差を計算
        let daysToAdd = targetDayOfWeekJS - startDayOfWeek;
        if (daysToAdd < 0) {
            daysToAdd += 7; // 次の週の該当曜日
        }

        const eventStart = new Date(semesterStart);
        eventStart.setDate(semesterStart.getDate() + daysToAdd);
        eventStart.setHours(time.h, time.m, 0);

        const eventEnd = new Date(eventStart);
        eventEnd.setMinutes(eventEnd.getMinutes() + duration);

        // TZID 指定時はローカル時刻をそのまま使用（UTC変換しない）
        const formatICalDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
        };

        // iCal フィールド生成
		icalContent.push(
			'BEGIN:VEVENT',
			`SUMMARY:${lesson.name}`,
			`LOCATION:${lesson.room}`,
            `DESCRIPTION: 開講部屋: ${lesson.room} / 教員名: ${lesson.teacher}`,
			`DTSTART;TZID=Asia/Tokyo:${formatICalDate(eventStart)}`,
			`DTEND;TZID=Asia/Tokyo:${formatICalDate(eventEnd)}`,
			`RRULE:FREQ=WEEKLY;UNTIL=${semesterEnd}`,
			'END:VEVENT'
		);
	}

	icalContent.push('END:VCALENDAR');

	return new Response(icalContent.join('\r\n'), {
		// レスポンスヘッダ
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'attachment; filename="timetable.ics"'
		}
	});
};
