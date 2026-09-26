import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contactLinks } from './contact-links.ts';

test('Brazilian mobile and landline numbers include the country code', () => {
  assert.deepEqual(contactLinks('(11) 99999-1234'), {
    tel: 'tel:+5511999991234', whatsapp: 'https://wa.me/5511999991234',
  });
  assert.deepEqual(contactLinks('(55) 3333-1234'), {
    tel: 'tel:+555533331234', whatsapp: 'https://wa.me/555533331234',
  });
});

test('existing country codes are preserved without duplicating 55', () => {
  for (const input of ['+55 (11) 99999-1234', '5511999991234', '0055 11 99999-1234']) {
    assert.equal(contactLinks(input)?.whatsapp, 'https://wa.me/5511999991234');
  }
  assert.deepEqual(contactLinks('+1 (212) 555-0123'), {
    tel: 'tel:+12125550123', whatsapp: 'https://wa.me/12125550123',
  });
});

test('absent or unusable phones do not expose contact actions', () => {
  for (const input of [undefined, null, '', '   ', '()-', '123', 'sem telefone', 'javascript:1234567890']) {
    assert.equal(contactLinks(input), null);
  }
});

test('numbers without DDD do not produce broken links', () => {
  for (const input of ['99999-1234', '3333-1234', '123456789012', '1122334455667788']) {
    assert.equal(contactLinks(input), null);
  }
});
