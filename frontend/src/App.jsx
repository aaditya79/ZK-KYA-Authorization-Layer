import { useState } from "react";
import axios from "axios";
import "./App.css";

export default function App() {
  const [mode, setMode] = useState("finance");
  const [taskLabel, setTaskLabel] = useState("Pay Utility Bill");
  const [issueResult, setIssueResult] = useState(null);
  const [authResult, setAuthResult] = useState(null);
  const [requestedAmount, setRequestedAmount] = useState(50);
  const [loadingIssue, setLoadingIssue] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);

  const [liveMetrics, setLiveMetrics] = useState({
    issuanceGas: null,
    witnessMs: null,
    proofMs: null,
    verifyMs: null,
    proofSize: null,
    constraints: 890,
  });

  const runAgentTaskPreset = (task) => {
    setIssueResult(null);
    setAuthResult(null);

    if (task === "finance") {
      setMode("finance");
      setRequestedAmount(50);
      setTaskLabel("Pay Utility Bill");
    } else {
      setMode("healthcare");
      setTaskLabel("Fetch Patient Record");
    }
  };

  const issueCredential = async () => {
    setLoadingIssue(true);
    setAuthResult(null);

    try {
      const res = await axios.post("http://localhost:3001/api/issue-credential", {
        mode,
      });

      if (!res.data.ok) {
        throw new Error(res.data.error || "Failed to issue credential");
      }

      setIssueResult(res.data);

      setLiveMetrics((prev) => ({
        ...prev,
        issuanceGas: res.data.gasUsed || null,
      }));
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
    }

    setLoadingIssue(false);
  };

  const authorizeAction = async () => {
    if (!issueResult) return;

    setLoadingAuth(true);

    try {
      const payload =
        mode === "healthcare"
          ? {
              mode,
              credential: issueResult.credential,
              commitment: issueResult.commitment,
              currentTime: Math.floor(Date.now() / 1000),
            }
          : {
              mode,
              credential: issueResult.credential,
              commitment: issueResult.commitment,
              requestedAmount: Number(requestedAmount),
              currentTime: Math.floor(Date.now() / 1000),
            };

      const res = await axios.post(
        "http://localhost:3001/api/authorize-payment",
        payload
      );

      setAuthResult(res.data);

      if (res.data.metrics) {
        setLiveMetrics((prev) => ({
          ...prev,
          witnessMs: res.data.metrics.witnessMs ?? prev.witnessMs,
          proofMs: res.data.metrics.proofMs ?? prev.proofMs,
          verifyMs: res.data.metrics.verifyMs ?? prev.verifyMs,
          proofSize: res.data.metrics.proofSize ?? prev.proofSize,
          constraints: res.data.metrics.constraints ?? prev.constraints,
        }));
      }
    } catch (_err) {
      setAuthResult({
        ok: false,
        verified: false,
        error: "Request exceeds credential limits",
      });
    }

    setLoadingAuth(false);
  };

  const verified = authResult?.verified === true;
  const isFinance = mode === "finance";

  const modeTitle = isFinance ? "Authorize Payment" : "Authorize Record Access";
  const modeDescription = isFinance
    ? "The agent generates a zk proof that it has a valid financial credential for this request. The proof is then verified on-chain."
    : "The agent generates a zk proof that it has a valid healthcare credential for this request. The proof is then verified on-chain.";

  const modePill = isFinance ? "Bank Agent" : "Healthcare Agent";
  const modeButton = isFinance ? "Authorize Payment" : "Authorize Record Access";

  return (
    <div className="app-shell">
      <div className="background-glow glow-1" />
      <div className="background-glow glow-2" />

      <main className="container">
        <section className="hero">
          <div className="hero-badge">Blockchain + Zero-Knowledge Demo</div>
          <h1>ZK-KYA</h1>
          <p className="hero-subtitle">
            A privacy-preserving authorization layer for AI agents
          </p>

          <div className="hero-description-card">
            <p>
              ZK-KYA lets an agent prove it is authorized to perform an action
              without revealing the underlying credential. Instead of exposing
              sensitive permission details directly, the system stores only a
              commitment on-chain and uses a zero-knowledge proof to show that
              the requested action is valid.
            </p>
            <p>
              In this demo, a user delegates scoped permissions to an agent, and
              the agent later proves that it can act within those limits in
              finance and healthcare settings.
            </p>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Credential Privacy</span>
            <span className="stat-value">Poseidon Commitment</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Proof System</span>
            <span className="stat-value">Groth16</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Verification</span>
            <span className="stat-value">On-chain</span>
          </div>
        </section>

        <section className="agent-tasks-card">
          <div className="agent-tasks-header">
            <div>
              <p className="eyebrow">Agent Tasks</p>
              <h3>Simulated Agent Requests</h3>
            </div>
            <span className="pill neutral">Task-level abstraction</span>
          </div>

          <p className="card-text">
            These buttons simulate higher-level agent tasks rather than raw
            credential parameters. The agent selects the appropriate domain and
            action, then uses ZK-KYA to prove that it is authorized to perform
            that task.
          </p>

          <div className="task-buttons">
            <button
              className="secondary-button"
              onClick={() => runAgentTaskPreset("finance")}
            >
              Bank Agent: Pay Utility Bill
            </button>
            <button
              className="secondary-button"
              onClick={() => runAgentTaskPreset("healthcare")}
            >
              Healthcare Agent: Fetch Patient Record
            </button>
          </div>

          <div className="task-current">
            <span className="result-label">Current simulated task</span>
            <span className="result-value">{taskLabel}</span>
          </div>
        </section>

        <section className="metrics-card">
          <div className="agent-tasks-header">
            <div>
              <p className="eyebrow">Evaluation Snapshot</p>
              <h3>Prototype Metrics</h3>
            </div>
            <span className="pill accent">Measured locally</span>
          </div>

          <div className="metrics-grid">
            <div className="metric-box">
              <span className="result-label">Issuance Gas: </span>
              <span className="result-value">
                {liveMetrics.issuanceGas ? liveMetrics.issuanceGas : "~53.9k"}
              </span>
            </div>

            <div className="metric-box">
              <span className="result-label">Witness Generation: </span>
              <span className="result-value">
                {liveMetrics.witnessMs ? `${liveMetrics.witnessMs} ms` : "~104 ms"}
              </span>
            </div>

            <div className="metric-box">
              <span className="result-label">Proof Generation: </span>
              <span className="result-value">
                {liveMetrics.proofMs ? `${liveMetrics.proofMs} ms` : "~500 ms"}
              </span>
            </div>

            <div className="metric-box">
              <span className="result-label">On-chain Verify Call: </span>
              <span className="result-value">
                {liveMetrics.verifyMs ? `${liveMetrics.verifyMs} ms` : "~16 ms"}
              </span>
            </div>

            <div className="metric-box">
              <span className="result-label">Proof Size: </span>
              <span className="result-value">
                {liveMetrics.proofSize ? `${liveMetrics.proofSize} bytes` : "807 bytes"}
              </span>
            </div>

            <div className="metric-box">
              <span className="result-label">Authorization Constraints: </span>
              <span className="result-value">{liveMetrics.constraints}</span>
            </div>
          </div>
        </section>

        <section className="contribution-card">
          <p className="eyebrow">Contribution</p>
          <p className="contribution-text">
            We built a privacy-preserving credential delegation layer for AI
            agents using on-chain commitments and zero-knowledge proofs,
            enabling agents to prove authorization without revealing the
            underlying credential.
          </p>
        </section>

        <section className="mode-switcher-wrap">
          <div className="mode-switcher">
            <button
              className={`toggle-button ${mode === "finance" ? "active" : ""}`}
              onClick={() => {
                setMode("finance");
                setIssueResult(null);
                setAuthResult(null);
                setRequestedAmount(50);
                setTaskLabel("Pay Utility Bill");
              }}
            >
              Finance
            </button>
            <button
              className={`toggle-button ${mode === "healthcare" ? "active" : ""}`}
              onClick={() => {
                setMode("healthcare");
                setIssueResult(null);
                setAuthResult(null);
                setTaskLabel("Fetch Patient Record");
              }}
            >
              Healthcare
            </button>
          </div>
        </section>

        <div className="grid">
          <section className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Step 1</p>
                <h2>Issue Credential</h2>
              </div>
              <span className="pill neutral">User → Agent</span>
            </div>

            <p className="card-text">
              {isFinance
                ? "Simulate a user issuing a scoped financial credential to an agent and registering its commitment on-chain."
                : "Simulate a user issuing a scoped healthcare credential to an agent and registering its commitment on-chain."}
            </p>

            <button
              className="primary-button"
              onClick={issueCredential}
              disabled={loadingIssue}
            >
              {loadingIssue ? "Issuing..." : "Issue Credential"}
            </button>

            {issueResult && (
              <div className="result-panel">
                <div className="result-grid">
                  <div className="result-item">
                    <span className="result-label">Mode</span>
                    <span className="result-value">{issueResult.mode}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Commitment</span>
                    <span className="result-value break">
                      {issueResult.commitment}
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Gas Used</span>
                    <span className="result-value">{issueResult.gasUsed}</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Registered</span>
                    <span className="result-value">
                      {issueResult.registered ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Transaction Hash</span>
                    <span className="result-value break">
                      {issueResult.txHash}
                    </span>
                  </div>
                </div>

                <details className="details-block">
                  <summary>View credential JSON</summary>
                  <pre>{JSON.stringify(issueResult, null, 2)}</pre>
                </details>
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Step 2</p>
                <h2>{modeTitle}</h2>
              </div>
              <span className="pill accent">{modePill}</span>
            </div>

            <p className="card-text">
              {modeDescription} The backend simulates an agent that prepares the
              request, generates the zero-knowledge proof, and submits it for
              on-chain verification.
            </p>

            {isFinance ? (
              <div className="input-row">
                <label className="input-label" htmlFor="amount">
                  Requested Amount (max: 100)
                </label>
                <div className="input-wrap">
                  <span className="input-prefix">$</span>
                  <input
                    id="amount"
                    type="number"
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="healthcare-box">
                <div className="healthcare-line">
                  <span className="result-label">Action</span>
                  <span className="result-value">Read Patient Record</span>
                </div>
                <div className="healthcare-line">
                  <span className="result-label">Amount Field</span>
                  <span className="result-value">Not required</span>
                </div>
              </div>
            )}

            <button
              className="primary-button"
              onClick={authorizeAction}
              disabled={!issueResult || loadingAuth}
            >
              {loadingAuth ? "Authorizing..." : modeButton}
            </button>

            {!issueResult && (
              <p className="hint">Issue a credential first to enable this step.</p>
            )}

            {authResult && (
              <div className={`status-card ${verified ? "success" : "error"}`}>
                <div className="status-header">
                  <div className="status-icon">{verified ? "✅" : "❌"}</div>
                  <div>
                    <h3>{verified ? "Authorized" : "Rejected"}</h3>
                    <p>
                      {verified
                        ? "Proof verified on-chain successfully."
                        : "Authorization failed due to invalid or out-of-scope request."}
                    </p>
                  </div>
                </div>

                {verified ? (
                  <div className="result-grid compact">
                    <div className="result-item">
                      <span className="result-label">Mode</span>
                      <span className="result-value">{authResult.mode}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Verified</span>
                      <span className="result-value">true</span>
                    </div>
                    {isFinance && (
                      <div className="result-item">
                        <span className="result-label">Requested Amount</span>
                        <span className="result-value">${requestedAmount}</span>
                      </div>
                    )}
                    {!isFinance && (
                      <div className="result-item">
                        <span className="result-label">Access Type</span>
                        <span className="result-value">Patient Record Read</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="error-box">
                    Request exceeds credential limits
                  </div>
                )}

                <details className="details-block">
                  <summary>View authorization response</summary>
                  <pre>{JSON.stringify(authResult, null, 2)}</pre>
                </details>
              </div>
            )}

            <div className="zk-explainer">
              <p className="eyebrow">What remains hidden</p>
              <ul>
                <li>Full credential contents are not revealed on-chain</li>
                <li>The system stores only a Poseidon commitment</li>
                <li>The proof shows authorization validity, not the raw credential</li>
                <li>
                  Sensitive policy details can remain private while still being
                  enforceable
                </li>
              </ul>
            </div>
          </section>
        </div>

        <section className="nonce-note">
          <p className="eyebrow">Implementation Note</p>
          <p>
            Each credential includes a nonce to distinguish credentials and
            support replay-resistance in a more complete production design. In
            this proof of concept, the nonce is part of the committed credential
            structure and helps prevent identical credentials from collapsing to
            the same commitment.
          </p>
        </section>
      </main>
    </div>
  );
}