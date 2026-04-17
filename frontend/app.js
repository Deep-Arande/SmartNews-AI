document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('verify-form');
    const input = document.getElementById('query-input');
    const submitBtn = document.getElementById('submit-btn');
    
    // UI Sections
    const loadingState = document.getElementById('loading-state');
    const resultsSection = document.getElementById('results-section');
    const errorState = document.getElementById('error-state');
    
    // Result Elements
    const verdictContainer = document.getElementById('verdict-container');
    const verdictIcon = document.getElementById('verdict-icon');
    const finalVerdict = document.getElementById('final-verdict');
    const scoreProgress = document.querySelector('.circular-progress');
    const scoreText = document.getElementById('score-text');
    const aiExplanation = document.getElementById('ai-explanation');
    
    // Lists
    const claimsList = document.getElementById('claims-list');
    const sourcesList = document.getElementById('sources-list');
    
    // Graph Instance
    let network = null;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const query = input.value.trim();
        if (!query) return;

        // Reset UI Context
        errorState.classList.add('hidden');
        resultsSection.classList.add('hidden');
        loadingState.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            // Replace with standard API URL
            const response = await fetch('http://localhost:8000/verify/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Verification request failed.');
            }

            const data = await response.json();
            
            // Populate UI Elements
            renderResults(data);

            loadingState.classList.add('hidden');
            resultsSection.classList.remove('hidden');
        } catch (err) {
            console.error(err);
            loadingState.classList.add('hidden');
            
            document.getElementById('error-message').textContent = err.message || 'Check if the backend is running at http://localhost:8000';
            errorState.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
        }
    });

    function renderResults(data) {
        // 1. Verdict
        const verdict = data.verdict || 'Unverified';
        finalVerdict.textContent = verdict;
        
        // Remove previous classes
        verdictContainer.className = 'card glass-panel verdict-card';
        verdictContainer.classList.add(`verdict-${verdict}`);
        
        // Update Icon based on verdict
        verdictIcon.className = '';
        if (verdict === 'True') verdictIcon.className = 'fa-solid fa-circle-check';
        else if (verdict === 'False') verdictIcon.className = 'fa-solid fa-circle-xmark';
        else verdictIcon.className = 'fa-solid fa-circle-question';

        // 2. Score
        const scorePercentage = Math.round((data.score || 0) * 100);
        scoreText.textContent = `${scorePercentage}%`;
        
        // Color based on score
        let scoreColor = '#f59e0b'; // Unverified yellow
        if (scorePercentage > 70) scoreColor = '#10b981'; // True green
        else if (scorePercentage < 40) scoreColor = '#ef4444'; // False red
        
        scoreProgress.style.background = `conic-gradient(${scoreColor} ${scorePercentage}%, var(--border-glass) ${scorePercentage}%)`;

        // 3. Explanation
        aiExplanation.textContent = data.explanation || 'No explanation provided.';

        // 4. Claims List
        claimsList.innerHTML = '';
        if (data.claims && data.claims.length > 0) {
            data.claims.forEach(claim => {
                const item = document.createElement('div');
                item.className = 'claim-item';
                item.innerHTML = `
                    <div class="claim-header">
                        <span class="claim-text">${claim.claim}</span>
                        <span class="claim-badge badge-${claim.verdict}">${claim.verdict}</span>
                    </div>
                    <p class="claim-exp">${claim.explanation}</p>
                `;
                claimsList.appendChild(item);
            });
        } else {
            claimsList.innerHTML = '<p class="text-muted">No claims extracted.</p>';
        }

        // 5. Sources List
        sourcesList.innerHTML = '';
        if (data.sources && data.sources.length > 0) {
            data.sources.forEach(source => {
                const score = (source.credibility_score * 100).toFixed(0);
                const item = document.createElement('div');
                item.className = 'source-item';
                item.innerHTML = `
                    <div class="source-info">
                        <h4>${source.domain}</h4>
                        <a href="${source.url}" target="_blank" rel="noopener noreferrer">View Source <i class="fa-solid fa-external-link-alt" style="font-size: 0.7rem"></i></a>
                    </div>
                    <div class="source-score" style="color: ${score > 50 ? '#10b981' : '#f59e0b'}">${score}%</div>
                `;
                sourcesList.appendChild(item);
            });
        } else {
            sourcesList.innerHTML = '<p class="text-muted">No sources found.</p>';
        }

        // 6. Graph Visualization
        renderGraph(data.graph);
    }

    function renderGraph(graphData) {
        if (!graphData || !graphData.nodes || !graphData.edges) {
            document.getElementById('graph-container').innerHTML = '<p style="padding: 2rem; color: #94a3b8; text-align: center;">Graph data unavailable.</p>';
            return;
        }

        const container = document.getElementById('graph-container');
        
        // Process nodes to make them prettier
        const processNodes = graphData.nodes.map(n => {
            let color = '#3b82f6'; // default Claim color
            let shape = 'box';
            let fontColor = '#ffffff';

            if (n.type === 'Claim') {
                color = '#38bdf8';
            } else if (n.type === 'Source') {
                color = '#f472b6';
                shape = 'ellipse';
            } else if (n.type === 'Concept') {
                color = '#a78bfa';
                shape = 'dot';
            }

            return {
                id: n.id,
                label: n.label || n.id,
                title: n.title || n.label || n.id, // Tooltip
                shape: shape,
                color: {
                    background: color,
                    border: '#ffffff',
                    highlight: { background: '#ffffff', border: color }
                },
                font: { color: fontColor }
            };
        });

        // Process edges
        const processEdges = graphData.edges.map(e => {
            let color = '#64748b'; // default slate-500
            if (e.relation === 'SUPPORTS') color = '#10b981';
            else if (e.relation === 'CONTRADICTS') color = '#ef4444';

            return {
                from: e.from,
                to: e.to,
                label: e.label || e.relation || '',
                color: { color: color },
                arrows: { to: { enabled: true, scaleFactor: 0.5 } },
                font: { color: '#cbd5e1', size: 10, align: 'horizontal' },
                dashes: e.relation === 'RELATES_TO'
            };
        });

        const data = {
            nodes: processNodes,
            edges: processEdges
        };

        const options = {
            nodes: {
                borderWidth: 2,
                shadow: true,
                font: {
                    face: 'Inter, sans-serif'
                }
            },
            edges: {
                width: 2,
                shadow: true,
                smooth: {
                    type: 'continuous'
                }
            },
            physics: {
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 100,
                    springConstant: 0.08
                },
                maxVelocity: 50,
                solver: 'forceAtlas2Based',
                timestep: 0.35,
                stabilization: { iterations: 150 }
            },
            interaction: {
                hover: true,
                zoomView: true,
                dragView: true
            }
        };

        // If network exists, destroy it before recreating to avoid memory leaks
        if (network !== null) {
            network.destroy();
            network = null;
        }

        network = new vis.Network(container, data, options);
    }
});
