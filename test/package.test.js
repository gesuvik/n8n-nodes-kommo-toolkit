const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const manifest = require('../package.json');

test('package has a publishable n8n community-node identity', () => {
	assert.equal(manifest.name, 'n8n-nodes-kommo-toolkit');
	assert.equal(manifest.private, undefined);
	assert.ok(manifest.keywords.includes('n8n-community-node-package'));
	assert.equal(manifest.publishConfig.access, 'public');
	assert.equal(manifest.publishConfig.registry, 'https://registry.npmjs.org/');
	assert.equal(manifest.scripts.prepublishOnly, undefined);
});

test('node metadata uses the public package prefix', () => {
	for (const nodeEntry of manifest.n8n.nodes) {
		const sourceMetadataPath = path.join(
			projectRoot,
			nodeEntry.replace(/^dist\//, '').replace(/\.node\.js$/, '.node.json'),
		);
		const metadata = JSON.parse(fs.readFileSync(sourceMetadataPath, 'utf8'));

		assert.match(metadata.node, /^n8n-nodes-kommo-toolkit\./);
	}
});

test('published files are explicitly allowlisted', () => {
	assert.deepEqual(manifest.files, ['dist', 'CHANGELOG.md', 'docs']);
	assert.ok(!manifest.files.includes('test'));
	assert.ok(!manifest.files.includes('artifacts'));
});
