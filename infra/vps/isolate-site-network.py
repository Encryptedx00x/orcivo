#!/usr/bin/env python3
"""Create a dedicated site/proxy network without restarting the shared proxy."""
import json, pathlib, shutil, subprocess
import yaml

NETWORK = 'orcivo_site_proxy'
stack = pathlib.Path('/srv/stack/docker-compose.yml')
orcivo = pathlib.Path('/srv/orcivo/docker-compose.yml')

def run(args, cwd=None):
    result = subprocess.run(args, cwd=cwd, capture_output=True)
    if result.returncode:
        raise RuntimeError('Command failed: ' + ' '.join(args[:3]) + '; configuration output withheld')
    return result.stdout

stack_data = yaml.safe_load(stack.read_text())
orcivo_data = yaml.safe_load(orcivo.read_text())
assert 'caddy' in stack_data['services'] and 'site' in orcivo_data['services']
if orcivo_data['services']['site'].get('networks') == ['site_proxy']:
    raise SystemExit('Already configured; verify current networks instead of repeating migration')
assert orcivo_data['services']['site']['networks'] == ['caddy']
saved = []
for path in [stack, orcivo]:
    backup = path.with_name(path.name + '.before-site-isolation-20261005')
    assert not backup.exists(), 'Backup exists; inspect before proceeding'
    shutil.copy2(path, backup); backup.chmod(0o600); saved.append((path, backup))
networks = stack_data['services']['caddy'].setdefault('networks', ['default'])
if isinstance(networks, list):
    if NETWORK not in networks: networks.append(NETWORK)
else:
    networks[NETWORK] = None
stack_data.setdefault('networks', {})[NETWORK] = {'external': True, 'name': NETWORK}
orcivo_data['services']['site']['networks'] = ['site_proxy']
orcivo_data['networks']['site_proxy'] = {'external': True, 'name': NETWORK}
try:
    stack.write_text(yaml.safe_dump(stack_data, sort_keys=False))
    orcivo.write_text(yaml.safe_dump(orcivo_data, sort_keys=False))
    for path in [stack, orcivo]: run(['docker', 'compose', 'config', '--quiet'], path.parent)
    existing = run(['docker', 'network', 'ls', '--format', '{{.Name}}']).decode().splitlines()
    if NETWORK not in existing: run(['docker', 'network', 'create', NETWORK])
    caddy = json.loads(run(['docker', 'inspect', 'stack-caddy-1']))[0]
    if NETWORK not in caddy['NetworkSettings']['Networks']:
        run(['docker', 'network', 'connect', NETWORK, 'stack-caddy-1'])
    run(['docker', 'compose', 'up', '-d', '--no-deps', 'site'], orcivo.parent)
    site = json.loads(run(['docker', 'inspect', 'orcivo-site']))[0]
    assert set(site['NetworkSettings']['Networks']) == {NETWORK}
    run(['docker', 'exec', 'stack-caddy-1', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'])
except BaseException:
    for path, backup in saved: shutil.copy2(backup, path)
    subprocess.run(['docker', 'compose', 'up', '-d', '--no-deps', 'site'], cwd=orcivo.parent, capture_output=True)
    raise
print('Site isolated on', NETWORK, '; shared Caddy restart not required')
