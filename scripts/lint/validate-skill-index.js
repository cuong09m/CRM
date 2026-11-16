#!/usr/bin/env node

/**
 * SKILL.md is the only list of skill cards. This check fails when a card is missing from it, when
 * an index link is dead, or when another file names a card that no longer exists, so a merge or
 * rename breaks lint instead of leaving a stale reference.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SKILLS = path.join(ROOT, '.agents', 'skills');
const CARDS = path.join(SKILLS, 'churchcrm');
const INDEX = path.join(CARDS, 'SKILL.md');
// Names of files in other repos or runtime artifacts that cards mention.
const EXTERNAL = new Set(['error-context.md', 'product-truth.md', 'ai-writing-quality-and-anti-slop.md', '.agents/DOCS_GUIDE.md']);
const ENTRY_FILES = ['CLAUDE.md', 'AGENTS.md', path.join('cypress', 'README.md')];

function mdFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return mdFiles(full);
        }
        return entry.name.endsWith('.md') ? [full] : [];
    });
}

// cardPaths are relative to the churchcrm folder: 'a.md' or '../b.md'.
function indexProblems(indexText, cardPaths) {
    const linked = new Set([...indexText.matchAll(/\]\((\.{1,2}\/)?([\w-]+\.md)\)/g)].map((match) => `${match[1] === '../' ? '../' : ''}${match[2]}`));
    return cardPaths.filter((name) => name !== 'SKILL.md' && !linked.has(name)).map((name) => `${name} is not listed in SKILL.md`);
}

function referenceProblems(text, exists) {
    const found = [];
    for (const match of text.matchAll(/`([\w./-]+\.md)`/g)) {
        const ref = match[1];
        if (EXTERNAL.has(ref)) {
            continue;
        }
        if (ref.includes('/') ? ref.startsWith('.agents/') && !exists(ref) : /^[a-z][a-z0-9-]*\.md$/.test(ref) && !exists(ref)) {
            found.push(ref);
        }
    }
    return found;
}

function main() {
    const markdown = (dir, prefix) => fs.readdirSync(dir).filter((name) => name.endsWith('.md')).map((name) => `${prefix}${name}`);
    const cardPaths = [...markdown(CARDS, ''), ...markdown(SKILLS, '../')];
    const indexText = fs.readFileSync(INDEX, 'utf8');
    const problems = indexProblems(indexText, cardPaths);

    for (const match of indexText.matchAll(/\]\((\.{1,2}\/[\w./-]+\.md)\)/g)) {
        if (!fs.existsSync(path.join(CARDS, match[1]))) {
            problems.push(`SKILL.md links ${match[1]}, which does not exist`);
        }
    }

    const exists = (ref) => {
        const bases = ref.includes('/') ? [ROOT] : [CARDS, SKILLS, ROOT];
        return bases.some((base) => fs.existsSync(path.join(base, ref)));
    };
    const scanned = [...mdFiles(SKILLS), ...ENTRY_FILES.map((file) => path.join(ROOT, file))];
    for (const file of scanned) {
        for (const ref of referenceProblems(fs.readFileSync(file, 'utf8'), exists)) {
            problems.push(`${path.relative(ROOT, file)} names ${ref}, which does not exist`);
        }
    }

    if (problems.length > 0) {
        console.error(problems.join('\n'));
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { indexProblems, referenceProblems };
