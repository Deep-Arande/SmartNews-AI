export default function Loader({ loading }) {
	if (!loading) return null;
	return (
		<div className="loader-overlay">
			<div className="spinner" />
		</div>
	);
}
