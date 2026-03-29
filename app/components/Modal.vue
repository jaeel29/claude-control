<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  closeOnOverlayClick?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: '',
  closeOnOverlayClick: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const close = () => emit('update:modelValue', false)

const onOverlay = () => { if (props.closeOnOverlayClick) close() }

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && props.modelValue) close() }

watch(() => props.modelValue, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKey)
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click="onOverlay">
        <Transition name="modal-slide">
          <div v-if="modelValue" class="modal-content" @click.stop>
            <div class="modal-header">
              <h2 class="modal-title">{{ title }}</h2>
              <button class="modal-close" @click="close" aria-label="Close">✕</button>
            </div>
            <div class="modal-body">
              <slot />
            </div>
            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 620px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.modal-close:hover { background: var(--bg-card-hover); color: var(--text-primary); }

/* Transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.modal-slide-enter-active { transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease; }
.modal-slide-leave-active { transition: transform 0.25s cubic-bezier(0.7, 0, 0.84, 0), opacity 0.2s ease; }
.modal-slide-enter-from, .modal-slide-leave-to { transform: translateY(16px) scale(0.97); opacity: 0; }
</style>
