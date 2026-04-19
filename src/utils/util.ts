export async function copyTextToClipboard(text: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }

        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        return !!ok;
    } catch (e) {
        return false;
    }
}

export default copyTextToClipboard;
