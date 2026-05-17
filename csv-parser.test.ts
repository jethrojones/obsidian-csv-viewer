import { describe, it, expect } from 'vitest';
import { parseCSV, parseTranscript, serializeCSV } from './csv-parser';

describe('parseCSV', () => {
    it('parses simple CSV with headers', () => {
        const csv = 'Name,Age,City\nAlice,30,NYC\nBob,25,LA';
        const result = parseCSV(csv);
        expect(result).toEqual([
            ['Name', 'Age', 'City'],
            ['Alice', '30', 'NYC'],
            ['Bob', '25', 'LA']
        ]);
    });

    it('handles quoted fields with commas', () => {
        const csv = 'Name,Description\nJohn,"Hello, World"\nJane,"A, B, C"';
        const result = parseCSV(csv);
        expect(result).toEqual([
            ['Name', 'Description'],
            ['John', 'Hello, World'],
            ['Jane', 'A, B, C']
        ]);
    });

    it('handles escaped quotes inside quoted fields', () => {
        const csv = 'Name,Quote\nBob,"He said ""Hello"""\nAlice,"Test ""one"" and ""two"""';
        const result = parseCSV(csv);
        expect(result).toEqual([
            ['Name', 'Quote'],
            ['Bob', 'He said "Hello"'],
            ['Alice', 'Test "one" and "two"']
        ]);
    });

    it('handles newlines inside quoted fields', () => {
        const csv = 'Name,Address\nJohn,"123 Main St\nApt 4"\nJane,"456 Oak Ave"';
        const result = parseCSV(csv);
        expect(result).toEqual([
            ['Name', 'Address'],
            ['John', '123 Main St\nApt 4'],
            ['Jane', '456 Oak Ave']
        ]);
    });

    it('handles CRLF line endings', () => {
        const csv = 'A,B\r\n1,2\r\n3,4';
        const result = parseCSV(csv);
        expect(result).toEqual([
            ['A', 'B'],
            ['1', '2'],
            ['3', '4']
        ]);
    });

    it('trims whitespace from unquoted cells', () => {
        const csv = 'Name,  Age  \n  Alice  ,  30  ';
        const result = parseCSV(csv);
        expect(result).toEqual([
            ['Name', 'Age'],
            ['Alice', '30']
        ]);
    });

    it('preserves whitespace in quoted cells', () => {
        const csv = 'Name,Value\n"  Alice  ","  30  "';
        const result = parseCSV(csv);
        expect(result).toEqual([
            ['Name', 'Value'],
            ['  Alice  ', '  30  ']
        ]);
    });

    it('skips empty rows', () => {
        const csv = 'A,B\n\n1,2\n\n3,4';
        const result = parseCSV(csv);
        expect(result).toEqual([
            ['A', 'B'],
            ['1', '2'],
            ['3', '4']
        ]);
    });

    it('handles empty string', () => {
        expect(parseCSV('')).toEqual([]);
    });

    it('handles single cell', () => {
        expect(parseCSV('hello')).toEqual([['hello']]);
    });

    it('handles trailing newline', () => {
        const csv = 'A,B\n1,2\n';
        const result = parseCSV(csv);
        expect(result).toEqual([
            ['A', 'B'],
            ['1', '2']
        ]);
    });
});

describe('serializeCSV', () => {
    it('serializes simple data', () => {
        const rows = [['A', 'B'], ['1', '2']];
        expect(serializeCSV(rows)).toBe('A,B\n1,2');
    });

    it('quotes fields with commas', () => {
        const rows = [['Name', 'Value'], ['Test', 'A, B']];
        expect(serializeCSV(rows)).toBe('Name,Value\nTest,"A, B"');
    });

    it('escapes quotes in fields', () => {
        const rows = [['Name'], ['Say "Hello"']];
        expect(serializeCSV(rows)).toBe('Name\n"Say ""Hello"""');
    });

    it('quotes fields with newlines', () => {
        const rows = [['Addr'], ['Line 1\nLine 2']];
        expect(serializeCSV(rows)).toBe('Addr\n"Line 1\nLine 2"');
    });
});

describe('round-trip', () => {
    it('can parse and serialize back to equivalent CSV', () => {
        const original = [
            ['Name', 'Description', 'Value'],
            ['Item 1', 'Has a comma, here', '100'],
            ['Item 2', 'Has "quotes"', '200'],
            ['Item 3', 'Normal text', '300']
        ];
        const serialized = serializeCSV(original);
        const parsed = parseCSV(serialized);
        expect(parsed).toEqual(original);
    });
});

describe('parseTranscript', () => {
    it('parses SRT cues with indices and multiline text', () => {
        const srt = [
            '1',
            '00:00:01,000 --> 00:00:03,500',
            'Hello there.',
            'Welcome back.',
            '',
            '2',
            '00:00:05,250 --> 00:00:07,000',
            'Next cue'
        ].join('\n');

        expect(parseTranscript(srt, 'srt')).toEqual([
            {
                number: 1,
                start: '00:00:01,000',
                end: '00:00:03,500',
                text: 'Hello there.\nWelcome back.'
            },
            {
                number: 2,
                start: '00:00:05,250',
                end: '00:00:07,000',
                text: 'Next cue'
            }
        ]);
    });

    it('parses VTT cues while skipping headers and notes', () => {
        const vtt = [
            'WEBVTT',
            '',
            'NOTE generated by example',
            'this note should be ignored',
            '',
            'intro',
            '00:00:01.000 --> 00:00:03.500 align:start position:0%',
            'Hello from VTT.',
            '',
            '00:00:05.250 --> 00:00:07.000',
            'Second cue'
        ].join('\n');

        expect(parseTranscript(vtt, 'vtt')).toEqual([
            {
                number: 1,
                start: '00:00:01.000',
                end: '00:00:03.500',
                text: 'Hello from VTT.'
            },
            {
                number: 2,
                start: '00:00:05.250',
                end: '00:00:07.000',
                text: 'Second cue'
            }
        ]);
    });
});
