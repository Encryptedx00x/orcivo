#!/usr/bin/env python3
"""Block legacy administration/maintenance before PHP execution; preserve secrets."""
import hashlib, pathlib, shutil, subprocess

path = pathlib.Path('/srv/stack/Caddyfile')
marker = '# Owner-authorized legacy ASCN exposure containment'
text = path.read_text()
anchor = 'root * /srv/sites/ascn.codes'
assert text.count(anchor) == 1, 'Unexpected ASCN configuration'
paths = [
    'admin-budgets.php', 'budgets-admin.php', 'add-form-fix.php',
    'add-redirect.php', 'add-script-to-html.php', 'add-scripts.php',
    'create-image-placeholders.php', 'direct-test.php', 'db.json',
    'config/*', 'admin/*',
]
if marker not in text:
    block = '\n\t' + marker + '\n\t@ascn_legacy_private path ' + ' '.join('/api-static/' + p for p in paths)
    block += '\n\trespond @ascn_legacy_private 404\n'
    candidate = text.replace(anchor, anchor + block, 1)
    backup = path.with_name('Caddyfile.before-security-20261005')
    assert not backup.exists(), 'Backup already exists; inspect before overwriting'
    shutil.copy2(path, backup)
    backup.chmod(0o600)
    path.write_text(candidate)
    try:
        for action in ['validate', 'reload']:
            result = subprocess.run(['docker', 'exec', 'stack-caddy-1', 'caddy', action,
                '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'], capture_output=True)
            if result.returncode:
                raise RuntimeError('Caddy ' + action + ' failed; output withheld to protect configuration')
    except BaseException:
        shutil.copy2(backup, path)
        subprocess.run(['docker', 'exec', 'stack-caddy-1', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'], capture_output=True)
        raise
print('ASCN containment active; blocked path patterns:', len(paths))
print('Configuration SHA256:', hashlib.sha256(path.read_bytes()).hexdigest())
