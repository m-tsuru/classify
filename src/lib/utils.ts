import LZString from 'lz-string';

export interface Lesson {
	name: string;
	room: string;
	teacher: string;
}

export type TimetableData = Record<string, Lesson>;
export const encodeData = (data: TimetableData): string => {
    const cleanedData: TimetableData = {};
    for (const [key, lesson] of Object.entries(data)) {
        if (lesson.name || lesson.room || lesson.teacher) {
            cleanedData[key] = lesson;
        }
    }
	const json = JSON.stringify(cleanedData);
	return LZString.compressToEncodedURIComponent(json);
};

export const decodeData = (encoded: string): TimetableData => {
	try {
		const json = LZString.decompressFromEncodedURIComponent(encoded);
		return json ? JSON.parse(json) : {};
	} catch (e) {
		console.error('Decode error', e);
		return {};
	}
};
