import networkx as nx
from typing import Dict, Any, List
from app.models.schemas import ClaimResult

def build_knowledge_graph(claims_results: List[ClaimResult]) -> Dict[str, Any]:
    """
    Build a simple knowledge graph using NetworkX based on the verified claims.
    """
    G = nx.DiGraph()
    
    for result in claims_results:
        parts = result.claim.split(" ")
        if len(parts) >= 3:
            subject = parts[0]
            obj = parts[-1]
            relation = " ".join(parts[1:-1])
            
            conflict = False
            # Very basic mock conflict check
            if "not" in relation.lower() and G.has_edge(subject, obj):
                conflict = True
                
            G.add_edge(subject, obj, relation=relation, verdict=result.verdict, conflict=conflict)
        else:
            G.add_node(result.claim, verdict=result.verdict)
            
    nodes = [{"id": n, "label": str(n), "properties": G.nodes[n]} for n in G.nodes()]
    edges = [{"source": u, "target": v, "relation": d.get("relation"), "verdict": d.get("verdict"), "conflict": d.get("conflict", False)} for u, v, d in G.edges(data=True)]
    
    return {"nodes": nodes, "edges": edges}
    
def detect_conflicts(graph_data: Dict[str, Any]) -> int:
    """
    Counts conflicts in the graph data.
    """
    conflicts = 0
    for edge in graph_data.get("edges", []):
        if edge.get("conflict"):
            conflicts += 1
    return conflicts
