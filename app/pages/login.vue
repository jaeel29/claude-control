<template>
	<div class="login">
		<form class="login__card" @submit.prevent="submit">
			<div class="login__brand">
				<Icon name="icons:logo" size="28" mode="svg" />
				<span>claudecontrol</span>
			</div>
			<p class="login__hint">Enter your access token to view this dashboard.</p>

			<input
				v-model="token"
				class="login__input"
				type="password"
				placeholder="Access token"
				autocomplete="off"
				autofocus
			/>

			<p v-if="error" class="login__error">{{ error }}</p>

			<button class="login__btn" type="submit" :disabled="loading || !token.trim()">
				{{ loading ? 'Checking…' : 'Unlock' }}
			</button>

			<p class="login__foot">The token was printed in the terminal when you started it.</p>
		</form>
	</div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' });

const route = useRoute();
const router = useRouter();

const token = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
	if (!token.value.trim() || loading.value) return;
	loading.value = true;
	error.value = '';
	try {
		await $fetch('/api/auth/login', { method: 'POST', body: { token: token.value.trim() } });
		await router.replace((route.query.redirect as string) || '/overview');
	} catch (e: any) {
		error.value = e?.data?.message || 'Invalid access token';
	} finally {
		loading.value = false;
	}
}
</script>

<style scoped lang="scss">
.login {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px;
	background: var(--color-bg);

	&__card {
		width: 100%;
		max-width: 360px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 28px;
		border: 1px solid var(--color-border);
		border-radius: 14px;
		background: var(--color-surface);
	}

	&__brand {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
	}

	&__hint {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
	}

	&__input {
		height: 40px;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: var(--color-text);
		font-size: 14px;
		font-family: inherit;
		outline: none;

		&:focus {
			border-color: var(--color-accent);
		}
	}

	&__error {
		color: #ef6a5a;
		font-size: 13px;
		margin: 0;
	}

	&__btn {
		height: 40px;
		border: none;
		border-radius: 8px;
		background: var(--color-accent);
		color: #fff;
		font-weight: 600;
		font-size: 14px;
		cursor: pointer;

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	&__foot {
		font-size: 12px;
		color: var(--color-text-subtle);
		margin: 0;
		text-align: center;
	}
}
</style>
