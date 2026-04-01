import { landingComparisonSection } from '@/content/landing.pt-BR'

export function ComparisonSection() {
  return (
    <section className="landing-section" id="comparativo">
      <div className="landing-container">
        <div className="landing-section-intro">
          <span className="landing-eyebrow">{landingComparisonSection.tag}</span>
          <h2 className="landing-h2">{landingComparisonSection.title}</h2>
          <p className="landing-subtitle landing-subtitle--narrow">{landingComparisonSection.sub}</p>
        </div>

        <div className="landing-comparison-wrap">
          <table className="landing-comparison-table" role="table">
            <thead>
              <tr>
                <th className="landing-cmp-th">{landingComparisonSection.tableHeaders.feature}</th>
                <th className="landing-cmp-th landing-cmp-th--buug">{landingComparisonSection.tableHeaders.buug}</th>
                <th className="landing-cmp-th">{landingComparisonSection.tableHeaders.others}</th>
              </tr>
            </thead>
            <tbody>
              {landingComparisonSection.rows.map((row, i) => (
                <tr key={i}>
                  <td className="landing-cmp-td landing-cmp-feature">{row.feature}</td>
                  <td className="landing-cmp-td landing-cmp-td--buug">
                    {row.buug
                      ? <span className="landing-cmp-check" aria-label="Sim">&#10003;</span>
                      : <span className="landing-cmp-dash" aria-label="Não">×</span>}
                  </td>
                  <td className="landing-cmp-td landing-cmp-center">
                    {row.others
                      ? <span className="landing-cmp-check" aria-label="Sim">&#10003;</span>
                      : <span className="landing-cmp-dash" aria-label="Não">×</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
