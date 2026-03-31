<script setup lang="ts">
interface ConversationMessage {
	role: 'user' | 'assistant';
	text: string;
	fullText: string;
	timestamp: string;
}

interface ActivityItem {
	text: string;
	fullText: string;
	timestamp: string;
	project: string;
	sessionId: string;
	cwd: string;
	aiTitle: string | null;
	messages: ConversationMessage[];
}

const showDrawer = ref(false);

// Mock test data with more comprehensive conversation
const testItem: ActivityItem = {
	text: 'Can you help me build a dashboard with activity tracking?',
	fullText: 'Can you help me build a dashboard with activity tracking? I want to see all my Claude Code sessions, their messages, and be able to resume conversations directly from the dashboard.',
	timestamp: new Date().toISOString(),
	project: 'claude-control',
	sessionId: 'test-session-123',
	cwd: '/Users/jabernuitee/Desktop/Jaber/Dev/claude-control',
	aiTitle: 'Dashboard Development Session',
	messages: [
		{
			role: 'user',
			text: 'Can you help me build a dashboard?',
			fullText: 'Can you help me build a dashboard with activity tracking? I want to see all my Claude Code sessions, their messages, and be able to resume conversations directly from the dashboard.',
			timestamp: new Date(Date.now() - 3600000).toISOString(),
		},
		{
			role: 'assistant',
			text: 'I can help you build a dashboard...',
			fullText: 'I can help you build a dashboard with activity tracking. Let me start by creating the components. First, I\'ll set up a Nuxt 4 project with TypeScript support, then create the activity page with session grouping and the UI components needed for displaying conversations.',
			timestamp: new Date(Date.now() - 3500000).toISOString(),
		},
		{
			role: 'user',
			text: 'Can you add a conversation modal?',
			fullText: 'Can you add a conversation modal that shows the full chat history? I want to see the messages formatted nicely like in Claude Code, with user messages on the right and assistant messages on the left.',
			timestamp: new Date(Date.now() - 2000000).toISOString(),
		},
		{
			role: 'assistant',
			text: 'Sure, I will create a drawer component...',
			fullText: 'Sure, I will create a drawer component for the conversation modal with proper chat layout. The drawer will slide in from the right side, show the session metadata at the top, display the full conversation history with user messages aligned right in teal and assistant messages aligned left, and include a follow-up input at the bottom so you can continue the conversation without going back to Claude Code.',
			timestamp: new Date(Date.now() - 1900000).toISOString(),
		},
		{
			role: 'user',
			text: 'Great! Can you also show AI-generated titles?',
			fullText: 'Great! Can you also show AI-generated titles for the sessions? I noticed that Claude Code generates nice descriptive titles for conversations, and it would be helpful to see those in the activity list instead of just the project names.',
			timestamp: new Date(Date.now() - 1200000).toISOString(),
		},
		{
			role: 'assistant',
			text: 'Absolutely! I\'ll extract the AI titles...',
			fullText: 'Absolutely! I\'ll extract the AI titles from the JSONL files. The titles are stored as type="ai-title" records at the beginning of each session file. I\'ll modify the readLines function to read the first 20 lines (to catch the ai-title record) plus the last 400 lines, then parse and display them in the UI.',
			timestamp: new Date(Date.now() - 1100000).toISOString(),
		},
		{
			role: 'user',
			text: 'The metrics aren\'t updating properly',
			fullText: 'The metrics aren\'t updating properly. They\'ve been showing the same numbers all day even though I\'ve been working with Claude Code. Can you check why the stats aren\'t changing?',
			timestamp: new Date(Date.now() - 600000).toISOString(),
		},
		{
			role: 'assistant',
			text: 'I found the issue...',
			fullText: 'I found the issue. The sessionLog function was only reading 2 files per project and limiting to the last 1500 lines, which meant it was missing many tool calls and activities. I\'ve created a new getTodayStats() function that scans all JSONL files modified today, reads them completely, and filters entries by timestamp to ensure accurate daily metrics. This will give you real-time updates of your tool calls, files modified, and commands executed today.',
			timestamp: new Date(Date.now() - 500000).toISOString(),
		},
		{
			role: 'user',
			text: 'Perfect! One more thing...',
			fullText: 'Perfect! One more thing - can you simplify the tool call styling in the chat? I like how Claude Code shows them as just a simple dot followed by the tool name and details, without all the extra padding and borders.',
			timestamp: new Date(Date.now() - 180000).toISOString(),
		},
		{
			role: 'assistant',
			text: 'Done! I\'ve simplified the tool calls...',
			fullText: 'Done! I\'ve simplified the tool calls to match Claude Code\'s minimal style. They now display as just a small 6px dot followed by the tool name and details in a simple flex layout, without any container, padding, borders, or background. Much cleaner and more like the native Claude Code experience.',
			timestamp: new Date(Date.now() - 120000).toISOString(),
		},
	],
};
</script>

<template>
	<div class="page">
		<div class="page-header">
			<h1 class="page-title">Test Page</h1>
			<p class="page-subtitle">Simple test of conversation drawer functionality</p>
		</div>

		<div class="test-section">
			<h2 class="section-title">Conversation Drawer Test</h2>
			<p class="section-description">
				This test page demonstrates the conversation drawer functionality built for the claude-control
				dashboard. The drawer component allows you to view full conversation histories, see AI-generated
				session titles, and continue conversations directly from the dashboard without returning to Claude Code.
			</p>

			<div class="feature-list">
				<div class="feature-item">
					<Icon name="lucide:check-circle-2" size="16" class="feature-icon" />
					<span>Sliding drawer interface with drag-to-dismiss</span>
				</div>
				<div class="feature-item">
					<Icon name="lucide:check-circle-2" size="16" class="feature-icon" />
					<span>Chat layout matching Claude Code (user right/teal, assistant left)</span>
				</div>
				<div class="feature-item">
					<Icon name="lucide:check-circle-2" size="16" class="feature-icon" />
					<span>Live output integration with tool call visualization</span>
				</div>
				<div class="feature-item">
					<Icon name="lucide:check-circle-2" size="16" class="feature-icon" />
					<span>Session resumption with follow-up input</span>
				</div>
				<div class="feature-item">
					<Icon name="lucide:check-circle-2" size="16" class="feature-icon" />
					<span>AI-generated session titles from JSONL parsing</span>
				</div>
			</div>

			<div class="test-controls">
				<UiButton @click="showDrawer = true">
					<template #icon-left>
						<Icon name="lucide:message-square" size="14" />
					</template>
					Open Test Conversation
				</UiButton>
			</div>

			<div class="test-info">
				<h3 class="info-title">Mock Session Data</h3>
				<div class="info-row">
					<span class="info-label">Project:</span>
					<code class="info-code">{{ testItem.project }}</code>
				</div>
				<div class="info-row">
					<span class="info-label">Session ID:</span>
					<code class="info-code">{{ testItem.sessionId }}</code>
				</div>
				<div class="info-row">
					<span class="info-label">Working Directory:</span>
					<code class="info-code">{{ testItem.cwd }}</code>
				</div>
				<div class="info-row">
					<span class="info-label">Messages:</span>
					<span class="info-value">{{ testItem.messages.length }} messages</span>
				</div>
				<div class="info-row">
					<span class="info-label">AI Title:</span>
					<span class="info-value">{{ testItem.aiTitle || '—' }}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Last Updated:</span>
					<span class="info-value">{{ new Date(testItem.timestamp).toLocaleString() }}</span>
				</div>
			</div>
		</div>

		<div class="test-section">
			<h2 class="section-title">Component Features</h2>
			<p class="section-description">
				The conversation drawer component integrates multiple advanced features to provide a seamless
				experience for reviewing and continuing Claude Code sessions.
			</p>

			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-header">
						<Icon name="lucide:layout-panel-left" size="20" class="feature-card-icon" />
						<h3 class="feature-card-title">Drawer Interface</h3>
					</div>
					<p class="feature-card-text">
						520px wide right-side drawer with smooth transitions, drag-to-dismiss functionality, and
						escape key support. Adapted from the cloud-dashboard drawer component.
					</p>
				</div>

				<div class="feature-card">
					<div class="feature-header">
						<Icon name="lucide:messages-square" size="20" class="feature-card-icon" />
						<h3 class="feature-card-title">Chat Layout</h3>
					</div>
					<p class="feature-card-text">
						Messages are displayed in a realistic chat format with user messages aligned right in teal
						and assistant messages aligned left, matching the native Claude Code interface.
					</p>
				</div>

				<div class="feature-card">
					<div class="feature-header">
						<Icon name="lucide:zap" size="20" class="feature-card-icon" />
						<h3 class="feature-card-title">Live Output</h3>
					</div>
					<p class="feature-card-text">
						Real-time streaming of tool calls and assistant responses using EventSource. Tool calls are
						shown as simple dot indicators with tool names, integrated inline with the chat history.
					</p>
				</div>

				<div class="feature-card">
					<div class="feature-header">
						<Icon name="lucide:play-circle" size="20" class="feature-card-icon" />
						<h3 class="feature-card-title">Session Resumption</h3>
					</div>
					<p class="feature-card-text">
						Continue conversations directly from the dashboard by typing in the follow-up input. The
						session is automatically resumed with the correct working directory and session ID.
					</p>
				</div>

				<div class="feature-card">
					<div class="feature-header">
						<Icon name="lucide:file-text" size="20" class="feature-card-icon" />
						<h3 class="feature-card-title">JSONL Parsing</h3>
					</div>
					<p class="feature-card-text">
						Extracts AI-generated session titles, messages, and metadata from Claude Code JSONL files.
						Reads first 20 lines for ai-title records and last 400 lines for recent activity.
					</p>
				</div>

				<div class="feature-card">
					<div class="feature-header">
						<Icon name="lucide:activity" size="20" class="feature-card-icon" />
						<h3 class="feature-card-title">Activity Tracking</h3>
					</div>
					<p class="feature-card-text">
						Comprehensive daily metrics including tool calls, files modified, commands executed, and
						sessions. Stats are calculated from all JSONL files modified today with timestamp filtering.
					</p>
				</div>
			</div>
		</div>

		<div class="test-section">
			<h2 class="section-title">Technical Implementation</h2>
			<p class="section-description">
				Key technical details about the implementation and architecture of the conversation drawer system.
			</p>

			<div class="tech-details">
				<div class="tech-block">
					<h4 class="tech-heading">Frontend Stack</h4>
					<ul class="tech-list">
						<li><strong>Nuxt 4</strong> with compatibility version 4</li>
						<li><strong>Vue 3 Composition API</strong> with &lt;script setup&gt;</li>
						<li><strong>TypeScript</strong> for type safety</li>
						<li><strong>CSS Custom Properties</strong> for theming</li>
					</ul>
				</div>

				<div class="tech-block">
					<h4 class="tech-heading">Data Flow</h4>
					<ul class="tech-list">
						<li><strong>JSONL Parsing</strong> - Extract messages, titles, and metadata</li>
						<li><strong>Session Grouping</strong> - Group activities by sessionId</li>
						<li><strong>Real-time Streaming</strong> - EventSource for live output</li>
						<li><strong>State Management</strong> - Reactive refs for UI state</li>
					</ul>
				</div>

				<div class="tech-block">
					<h4 class="tech-heading">Key Components</h4>
					<ul class="tech-list">
						<li><code>UiDrawer.vue</code> - Reusable drawer with drag support</li>
						<li><code>ConversationModal.vue</code> - Chat interface with streaming</li>
						<li><code>ActivitySessionRow.vue</code> - Session list items</li>
						<li><code>/api/run</code> - Session execution endpoint</li>
					</ul>
				</div>

				<div class="tech-block">
					<h4 class="tech-heading">Performance Optimizations</h4>
					<ul class="tech-list">
						<li><strong>Selective File Reading</strong> - First 20 + last 400 lines</li>
						<li><strong>Timestamp Filtering</strong> - Only process today's data</li>
						<li><strong>Efficient Grouping</strong> - Single-pass session aggregation</li>
						<li><strong>Lazy Loading</strong> - Messages loaded on drawer open</li>
					</ul>
				</div>
			</div>
		</div>

		<ConversationModal v-model="showDrawer" :item="testItem" />
	</div>
</template>

<style scoped>
.page-header {
	margin-bottom: 32px;
}
.page-title {
	font-size: 22px;
	font-weight: 700;
	color: var(--text-primary);
	letter-spacing: -0.02em;
}
.page-subtitle {
	font-size: 13px;
	color: var(--text-secondary);
	margin-top: 3px;
}

.test-section {
	background: var(--bg-card);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 24px;
	box-shadow: var(--shadow-sm);
}

.section-title {
	font-size: 16px;
	font-weight: 600;
	color: var(--text-primary);
	margin-bottom: 8px;
}

.section-description {
	font-size: 13px;
	color: var(--text-secondary);
	margin-bottom: 20px;
}

.test-controls {
	margin-bottom: 24px;
}

.feature-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin-bottom: 24px;
	padding: 16px;
	background: var(--bg-surface);
	border-radius: var(--radius-sm);
}

.feature-item {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 13px;
	color: var(--text-primary);
}

.feature-icon {
	color: var(--accent);
	flex-shrink: 0;
}

.test-info {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 16px;
	background: var(--bg-surface);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
}

.info-title {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-primary);
	margin-bottom: 4px;
}

.info-row {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 12px;
}

.info-label {
	color: var(--text-secondary);
	font-weight: 500;
	min-width: 130px;
}

.info-code {
	color: var(--text-primary);
	font-family: monospace;
	font-size: 11px;
	background: var(--bg-page);
	padding: 2px 6px;
	border-radius: 3px;
}

.info-value {
	color: var(--text-primary);
}

.features-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	gap: 16px;
	margin-top: 20px;
}

.feature-card {
	padding: 16px;
	background: var(--bg-surface);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	transition: all 0.2s ease;
}

.feature-card:hover {
	border-color: var(--accent);
	box-shadow: var(--shadow-sm);
}

.feature-header {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 10px;
}

.feature-card-icon {
	color: var(--accent);
	flex-shrink: 0;
}

.feature-card-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
	margin: 0;
}

.feature-card-text {
	font-size: 12px;
	color: var(--text-secondary);
	line-height: 1.5;
	margin: 0;
}

.tech-details {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 16px;
	margin-top: 20px;
}

.tech-block {
	padding: 16px;
	background: var(--bg-surface);
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
}

.tech-heading {
	font-size: 13px;
	font-weight: 600;
	color: var(--text-primary);
	margin: 0 0 12px 0;
}

.tech-list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.tech-list li {
	font-size: 12px;
	color: var(--text-secondary);
	line-height: 1.4;
	padding-left: 16px;
	position: relative;
}

.tech-list li::before {
	content: '→';
	position: absolute;
	left: 0;
	color: var(--accent);
}

.tech-list code {
	font-family: monospace;
	font-size: 11px;
	color: var(--text-primary);
	background: var(--bg-page);
	padding: 1px 4px;
	border-radius: 3px;
}
</style>
