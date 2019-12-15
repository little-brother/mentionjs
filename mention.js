function mention (opts = {}) {
	opts = Object.assign({}, {
		lookup: 'lookup',
		id: '',
		selector: '',
		element: null,
		symbol: '@',
		items: [],
		item_template: '<img src = "${item.image}"><div>${item.name}</div><div>${item.email}</div>' 
	}, opts);

	var $e = opts.id && document.getElementById(opts.id) || opts.selector && document.querySelector(opts.selector) || opts.element;
	if (!$e)
		return console.error('Invalid element selector', opts);

	var $lookup = document.createElement('div');
	$lookup.classList = 'mention-lookup-nt autohide ' + opts.lookup;
	$e.parentNode.insertBefore($lookup, $e.nextSibling);
	
	$e.addEventListener('keydown', processKey);
	$e.addEventListener('keyup', showLookup);
	$e.addEventListener('click', hideLookup);

	var range, start, end, prev_word;

	var isFixed = false;
	var $el = $lookup.parentNode;
	while ($el && $el.nodeName.toLowerCase() !== 'body' && !isFixed) {
		isFixed = window.getComputedStyle($el).getPropertyValue('position').toLowerCase() === 'fixed';
		$el = $el.parentElement;
	}
	
	function showLookup (event) {		
		var sel = window.getSelection();
	
		var text = sel.anchorNode && sel.anchorNode.nodeValue || '';
		var curr = sel.focusOffset;
		var getLength = arr => arr instanceof Array && arr.length > 0 ? arr[0].length : 0;
	
		start = curr - getLength(text.slice(0, curr).match(/[\S]+$/g));
		end = curr + getLength(text.slice(curr).match(/^[\S]+/g));
	
		var word = text.substring(start, end);
		if (!word || word[0] != opts.symbol) { 
			prev_word = '';	
			return hideLookup();
		}

		if (word == prev_word)
			return;
		prev_word = word;

		range = sel.getRangeAt(0);
		var pos = {x: 0, y: 0};

		var clone = range.cloneRange();
		if (clone.getClientRects) {
			clone.collapse(true);
			var rect = clone.getClientRects()[0];

			var $parent = $lookup.parentNode;
			var parentRect = $parent.getBoundingClientRect();
			if (rect) {
				pos.y = rect.top - (isFixed ? parentRect.top - $parent.offsetTop : 0);
				pos.x = rect.left - (isFixed ? parentRect.left - $parent.offsetLeft : 0);
			}
		}
	
		$lookup.style.left = pos.x + 'px';
		$lookup.style.top = pos.y + 'px';
		
		var items = opts.items
			.filter(e => e.name.toLowerCase().includes(word.slice(1)))
			.map(item => eval('\`<li class = "mention-li-nt ${opts.lookup}" data-name = "${item.name}" data-id = "${item.id}">' + opts.item_template + '</li>\`'));

		if (!items.length)
			return hideLookup(); 

		$lookup.innerHTML = '<ul>' + items.join('') + '</ul>';
		[...$lookup.firstElementChild.children]
			.forEach($el => $el.addEventListener('click', onClick) || $el.addEventListener('mouseenter', onHover));
		$lookup.firstElementChild.children[0].setAttribute('current', true);

		if ($lookup.hasAttribute('hidden'))
			$lookup.removeAttribute('hidden');

		var bounding = $lookup.getBoundingClientRect();
		if (!(bounding.top >= 0 && bounding.left >= 0 &&
			bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
			bounding.right <= (window.innerWidth || document.documentElement.clientWidth)))
			$lookup.style.top = parseInt($lookup.style.top) - 10 - $lookup.clientHeight + 'px';
	}

	function hideLookup () {
		if (!$lookup.hasAttribute('hidden'))
			$lookup.setAttribute('hidden', true);
	}

	function onClick (event) {
		var $el = event.target.classList.contains('mention-li-nt') ? event.target : event.target.parentElement;

		var $mention = document.createElement('input');
		$mention.classList = 'mention-nt ' + opts.lookup;
		$mention.type = 'button';
		$mention.value = $el.dataset.name;
		$mention.setAttribute('item-id', $el.dataset.id);
		$mention.setAttribute('disabled', true);
	
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
		range.setStart(sel.anchorNode, start);
		range.setEnd(sel.anchorNode, end);
		range.deleteContents();
		range.insertNode($mention);
		sel.collapseToEnd();

		hideLookup();
	}

	function onHover(event) {
		var $el = event.target.closest('.mention-li-nt');
		if ($el.hasAttribute('current'))
			return;

		[...$lookup.firstElementChild.children]
			.filter($el => $el.hasAttribute('current'))
			.forEach($el => $el.removeAttribute('current'));
		$el.setAttribute('current', true);
	}

	function processKey (event) {
		var code = event.key;
		if (['ArrowUp', 'ArrowDown', 'Enter'].indexOf(code) == -1 || $lookup.hasAttribute('hidden'))
			return;

		event.preventDefault();
		if (code == 'Enter')
			return $lookup.querySelector('[current]').click();

		var $children = [...$lookup.firstElementChild.children];
		var curr = $children.findIndex($el => $el.hasAttribute('current'));
		$children[curr].removeAttribute('current');
		
		var $next = $children[($children.length + curr + (code == 'ArrowUp' ? -1: 1)) % $children.length];
		$next.setAttribute('current', true);	
		$next.scrollIntoView(false);	
	}
}