import type { InventoryItem } from './inventory';

export function InventoryFields({ item }: { item?: InventoryItem }): JSX.Element {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Preços e estoque</legend>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        <div>
          <label htmlFor="sale_price" style={labelStyle}>
            Preço de venda (R$) *
          </label>
          <input
            className="ov-input"
            id="sale_price"
            name="sale_price"
            type="text"
            inputMode="decimal"
            required
            defaultValue={item?.sale_price ?? item?.unit_price ?? ''}
            placeholder="0,00"
            pattern="\d{1,10}([.,]\d{1,2})?"
            aria-describedby="price-help"
          />
        </div>
        <div>
          <label htmlFor="cost_price" style={labelStyle}>
            Preço de custo (R$) *
          </label>
          <input
            className="ov-input"
            id="cost_price"
            name="cost_price"
            type="text"
            inputMode="decimal"
            required
            defaultValue={item?.cost_price ?? '0.00'}
            pattern="\d{1,10}([.,]\d{1,2})?"
            aria-describedby="price-help"
          />
        </div>
        <div>
          <label htmlFor="quantity" style={labelStyle}>
            Quantidade *
          </label>
          <input
            className="ov-input"
            id="quantity"
            name="quantity"
            type="number"
            required
            min="0"
            max="2147483647"
            step="1"
            defaultValue={item?.quantity ?? 0}
          />
        </div>
        <div>
          <label htmlFor="low_stock_threshold" style={labelStyle}>
            Limite de estoque baixo *
          </label>
          <input
            className="ov-input"
            id="low_stock_threshold"
            name="low_stock_threshold"
            type="number"
            required
            min="0"
            max="2147483647"
            step="1"
            defaultValue={item?.low_stock_threshold ?? 5}
            aria-describedby="stock-help"
          />
        </div>
      </div>
      <p id="price-help" style={helpStyle}>
        Use vírgula ou ponto nos preços, com até duas casas decimais.
      </p>
      <p id="stock-help" style={helpStyle}>
        Produtos com quantidade igual ou inferior ao limite recebem o aviso de estoque baixo.
        Serviços não recebem esse aviso.
      </p>
    </fieldset>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
};
const helpStyle: React.CSSProperties = { fontSize: 12, color: '#64748B', margin: '8px 0 0' };
