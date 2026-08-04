import type { MatchGroup } from '../types';

interface ComparisonCardProps {
  match: MatchGroup;
}

const SOURCE_LABELS: Record<string, string> = {
  thuocsi: 'Thuocsi',
  longchau: 'Long Châu',
  pharmart: 'Pharmart',
  medigo: 'Medigo',
};

const SOURCE_COLORS: Record<string, string> = {
  thuocsi: '#e74c3c',
  longchau: '#27ae60',
  pharmart: '#2980b9',
  medigo: '#8e44ad',
};

function formatPrice(price: number): string {
  if (!price || price <= 0) return 'Liên hệ';
  return Math.round(price).toLocaleString('vi-VN') + '₫';
}

function escapeHtml(text: string): string {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

export function ComparisonCard({ match }: ComparisonCardProps) {
  const { name, products, prices, cheapest, priceDiff, sourceCount } = match;

  const sources: Array<'thuocsi' | 'longchau' | 'pharmart' | 'medigo'> = ['thuocsi', 'longchau', 'pharmart', 'medigo'];

  return (
    <div className="compare-card">
      <div className="card-header">
        <h3>{escapeHtml(name)}</h3>
        <div className="card-badges">
          {sourceCount >= 3 && <span className="badge badge-match">Đ.IsMatch trên {sourceCount} nguồn</span>}
          {priceDiff !== null && priceDiff > 0 && (
            <span className="badge badge-diff">Chênh lệch: {formatPrice(priceDiff)}</span>
          )}
        </div>
      </div>
      <div className="card-body card-body--4col">
        {sources.map(source => {
          const product = (products as Record<string, any>)[source];
          const price = (prices as Record<string, number>)[source];
          const isCheapest = cheapest === source && price > 0;
          const hasProduct = !!product;

          return (
            <div key={source} className={`price-col ${isCheapest ? 'winner' : ''} ${!hasProduct ? 'no-product' : ''}`}>
              <div className="store-name" style={{ borderColor: SOURCE_COLORS[source] }}>
                {SOURCE_LABELS[source]}
              </div>
              {hasProduct ? (
                <>
                  <div className={`price ${isCheapest ? 'price--best' : ''}`}>
                    {formatPrice(price)}
                  </div>
                  {product.image_url || product.image ? (
                    <img src={product.image_url || product.image} className="product-img" alt="" />
                  ) : null}
                  <a
                    href={escapeHtml(product.product_url || product.url || '#')}
                    target="_blank"
                    className="btn btn-view"
                    rel="noopener noreferrer"
                  >
                    Xem
                  </a>
                </>
              ) : (
                <div className="no-product-text">Không có</div>
              )}
              {isCheapest && <div className="best-badge">Rẻ nhất</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
