import { Octicon } from './Octicon'

type ErrorPanelProps = {
	error: string,
	onDismiss?: () => unknown,
}
export function ErrorPanel({ error, onDismiss }: ErrorPanelProps) {
	return <div class="error">
		{onDismiss && <div class="error-dismiss" onClick={onDismiss}>{Octicon.x}</div>}
		<h3>{error}</h3>
		<p>If you think this is a bug, you can report it <a href="https://github.com/misode/misode.github.io/issues/new" target="_blank">on GitHub</a></p>
	</div>
}
