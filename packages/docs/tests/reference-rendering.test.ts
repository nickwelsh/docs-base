import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createReference, type ReferenceEntry } from '@nickwelsh/refquill-fumadocs';
import { ReferenceContent } from '../dist/components/docs/reference.js';

test('type parameters use disclosures that contain their own indented details', () => {
    const parameters: ReferenceEntry[] = [
        ['TValues', 'Extends', 'object'],
        ['TOutput', 'Default', 'TValues'],
        ['TSuccess', 'Default', 'void'],
        ['TError', 'Default', 'unknown'],
        ['TServices', 'Default', 'never'],
        ['TUnconstrained'],
    ].map(([name, title, value]) => ({
        kind: 'entry',
        id: name!,
        title: name!,
        type: { key: 'type-parameter', label: 'type parameter' },
        display: 'static',
        blocks: title
            ? [{ kind: 'section', id: `${name}-detail`, title, blocks: [{ kind: 'markdown', value: value! }] }]
            : [],
    }));
    const rendering = createReference({
        input: {
            schemaVersion: 1,
            title: 'API',
            children: [{ kind: 'page', id: 'session', title: 'createFormSession', blocks: parameters }],
        },
    });
    const html = renderToStaticMarkup(createElement(ReferenceContent, { rendering, nodeId: 'session' }));
    for (const parameter of parameters) {
        assert.ok(
            html.includes(
                `<details id="${parameter.id}" class="refquill-entry refquill-member" data-reference-type="type-parameter" data-reference-row="${parameter.id}"><summary>`,
            ),
            `${parameter.title} should be collapsed initially`,
        );
        assert.ok(
            html.includes(
                `</summary><div class="refquill-member-body">${parameter.blocks?.length ? `<section id="${parameter.id}-detail"` : '</div></details>'}`,
            ),
        );
    }
    assert.equal((html.match(/class="refquill-disclosure-icon"/gu) ?? []).length, parameters.length);
    assert.ok(
        parameters.every((parameter) => parameter.display === 'static'),
        'rendering must not mutate the document',
    );
});
