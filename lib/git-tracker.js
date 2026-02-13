// lib/git-tracker.js - Git integration for tracking protocol changes
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class GitProtocolTracker {
    constructor(repoPath = './protocol-repo') {
        this.repoPath = repoPath;
        this.protocolsDir = path.join(repoPath, 'protocols');
        this.changesDir = path.join(repoPath, 'changes');
        this.ensureRepo();
    }

    ensureRepo() {
        if (!fs.existsSync(this.repoPath)) {
            fs.mkdirSync(this.repoPath, { recursive: true });
            this.initRepo();
        }

        [this.protocolsDir, this.changesDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    initRepo() {
        try {
            execSync('git init', { cwd: this.repoPath, stdio: 'ignore' });
            execSync('git config user.email "stream-system@local"', { cwd: this.repoPath, stdio: 'ignore' });
            execSync('git config user.name "Streaming System"', { cwd: this.repoPath, stdio: 'ignore' });

            // Create initial README
            fs.writeFileSync(
                path.join(this.repoPath, 'README.md'),
                '# Streaming Protocol Versions\n\nTracking all streaming protocol changes and schema versions.\n'
            );

            execSync('git add .', { cwd: this.repoPath, stdio: 'ignore' });
            execSync('git commit -m "Initial commit: Protocol tracking system"', { cwd: this.repoPath, stdio: 'ignore' });

            console.log('[GitTracker] Repository initialized');
        } catch (err) {
            console.error('[GitTracker] Init error:', err.message);
        }
    }

    // Track a protocol schema change
    trackProtocolChange(protocolName, schema, metadata = {}) {
        const timestamp = new Date().toISOString();
        const version = this.generateVersion(schema);
        const filename = `${protocolName}-v${version}.json`;
        const filepath = path.join(this.protocolsDir, filename);

        const protocolData = {
            name: protocolName,
            version: version,
            timestamp: timestamp,
            schema: schema,
            metadata: {
                ...metadata,
                nodeVersion: process.version,
                platform: process.platform
            }
        };

        // Write schema file
        fs.writeFileSync(filepath, JSON.stringify(protocolData, null, 2));

        // Create changelog entry
        const changeEntry = {
            timestamp,
            protocol: protocolName,
            version,
            action: metadata.action || 'updated',
            description: metadata.description || 'Schema updated',
            hash: this.hashSchema(schema)
        };

        const changelogPath = path.join(this.changesDir, `${protocolName}-changelog.json`);
        let changelog = [];

        if (fs.existsSync(changelogPath)) {
            changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
        }

        changelog.push(changeEntry);
        fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2));

        // Git commit
        this.commitChange(protocolName, version, metadata.description);

        return { version, filepath, changeEntry };
    }

    generateVersion(schema) {
        const hash = this.hashSchema(schema);
        return hash.substring(0, 8);
    }

    hashSchema(schema) {
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(schema))
            .digest('hex');
    }

    commitChange(protocolName, version, description) {
        try {
            execSync('git add .', { cwd: this.repoPath, stdio: 'ignore' });
            const commitMsg = `protocol(${protocolName}): ${description || 'v' + version}`;
            execSync(`git commit -m "${commitMsg}" --allow-empty`, { cwd: this.repoPath, stdio: 'ignore' });
            console.log(`[GitTracker] Committed: ${commitMsg}`);
        } catch (err) {
            // Ignore "nothing to commit" errors
            if (!err.message.includes('nothing to commit')) {
                console.error('[GitTracker] Commit error:', err.message);
            }
        }
    }

    // Get protocol diff between versions
    getDiff(protocolName, fromVersion, toVersion) {
        try {
            const fromFile = `protocols/${protocolName}-v${fromVersion}.json`;
            const toFile = `protocols/${protocolName}-v${toVersion}.json`;

            const diff = execSync(
                `git diff ${fromFile} ${toFile} || diff ${fromFile} ${toFile}`,
                { cwd: this.repoPath, encoding: 'utf8' }
            );

            return diff;
        } catch (err) {
            return `Error generating diff: ${err.message}`;
        }
    }

    // Stream protocol history
    async *streamHistory(protocolName) {
        const changelogPath = path.join(this.changesDir, `${protocolName}-changelog.json`);

        if (!fs.existsSync(changelogPath)) {
            return;
        }

        const changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));

        for (const entry of changelog) {
            yield entry;
        }
    }

    // Get current protocol version
    getCurrentVersion(protocolName) {
        const files = fs.readdirSync(this.protocolsDir)
            .filter(f => f.startsWith(`${protocolName}-v`))
            .sort()
            .reverse();

        if (files.length === 0) return null;

        const latest = files[0];
        const match = latest.match(/-v([a-f0-9]+)\.json$/);
        return match ? match[1] : null;
    }
}

module.exports = GitProtocolTracker;
