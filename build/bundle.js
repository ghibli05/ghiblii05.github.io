
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.43.1 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let p0;
    	let t2;
    	let br0;
    	let t3;
    	let br1;
    	let t4;
    	let br2;
    	let t5;
    	let img0;
    	let img0_src_value;
    	let t6;
    	let br3;
    	let t7;
    	let t8;
    	let img1;
    	let img1_src_value;
    	let t9;
    	let br4;
    	let t10;
    	let p1;
    	let t12;
    	let br5;
    	let t13;
    	let hr;
    	let t14;
    	let img2;
    	let img2_src_value;
    	let t15;
    	let h2;
    	let t17;
    	let img3;
    	let img3_src_value;
    	let t18;
    	let img4;
    	let img4_src_value;
    	let t19;
    	let h3;
    	let t21;
    	let a;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "ประวัติ";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("ชื่อ พัฒนน์ ธิติเสวงศ์ (ผักหวาน) ");
    			br0 = element("br");
    			t3 = text("\n        อายู16ปี  เกิดเดือนมิถุนายน วันที่2 ");
    			br1 = element("br");
    			t4 = text("\n\t\tเรียนอยู่ที่โรงเรียนไตรพัฒน์ ");
    			br2 = element("br");
    			t5 = space();
    			img0 = element("img");
    			t6 = space();
    			br3 = element("br");
    			t7 = text("\n        อาหารที่ชอบ ชอบพวกมันฝรั่ง");
    			t8 = space();
    			img1 = element("img");
    			t9 = space();
    			br4 = element("br");
    			t10 = space();
    			p1 = element("p");
    			p1.textContent = "สัตว์ที่ชอบ";
    			t12 = text("\n\t ชอบแมวกับจิ้งจอก ");
    			br5 = element("br");
    			t13 = space();
    			hr = element("hr");
    			t14 = space();
    			img2 = element("img");
    			t15 = space();
    			h2 = element("h2");
    			h2.textContent = "ผลงาน งานวาด";
    			t17 = space();
    			img3 = element("img");
    			t18 = space();
    			img4 = element("img");
    			t19 = space();
    			h3 = element("h3");
    			h3.textContent = "แนวเพลงที่ชอบ";
    			t21 = space();
    			a = element("a");
    			a.textContent = "คลิก";
    			attr_dev(h1, "class", "svelte-1tky8bj");
    			add_location(h1, file, 1, 1, 8);
    			add_location(br0, file, 4, 41, 76);
    			add_location(br1, file, 5, 44, 125);
    			add_location(br2, file, 6, 31, 161);
    			if (!src_url_equal(img0.src, img0_src_value = "img\\4.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "1");
    			add_location(img0, file, 7, 4, 170);
    			add_location(br3, file, 7, 34, 200);
    			add_location(p0, file, 3, 4, 31);
    			if (!src_url_equal(img1.src, img1_src_value = "https://www.thaiticketmajor.com/bus/imgUpload/newsLarge5827_b.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file, 10, 4, 253);
    			add_location(br4, file, 10, 89, 338);
    			add_location(p1, file, 11, 5, 348);
    			add_location(br5, file, 12, 19, 386);
    			add_location(hr, file, 13, 4, 395);
    			if (!src_url_equal(img2.src, img2_src_value = "https://i.pinimg.com/564x/98/86/3d/98863de0d03ff089528485b97bc230be.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Patnaree");
    			add_location(img2, file, 14, 4, 404);
    			add_location(h2, file, 15, 4, 507);
    			if (!src_url_equal(img3.src, img3_src_value = "img\\2.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "width", "400");
    			attr_dev(img3, "height", "400");
    			attr_dev(img3, "alt", "");
    			add_location(img3, file, 16, 4, 533);
    			if (!src_url_equal(img4.src, img4_src_value = "img\\1.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "width", "400");
    			attr_dev(img4, "height", "400");
    			attr_dev(img4, "alt", "");
    			add_location(img4, file, 17, 4, 588);
    			add_location(h3, file, 18, 1, 643);
    			attr_dev(a, "href", "https://www.youtube.com/c/ooo0eve0ooo");
    			attr_dev(a, "target", "_blank");
    			add_location(a, file, 19, 1, 668);
    			attr_dev(main, "class", "svelte-1tky8bj");
    			add_location(main, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, p0);
    			append_dev(p0, t2);
    			append_dev(p0, br0);
    			append_dev(p0, t3);
    			append_dev(p0, br1);
    			append_dev(p0, t4);
    			append_dev(p0, br2);
    			append_dev(p0, t5);
    			append_dev(p0, img0);
    			append_dev(p0, t6);
    			append_dev(p0, br3);
    			append_dev(p0, t7);
    			append_dev(main, t8);
    			append_dev(main, img1);
    			append_dev(main, t9);
    			append_dev(main, br4);
    			append_dev(main, t10);
    			append_dev(main, p1);
    			append_dev(main, t12);
    			append_dev(main, br5);
    			append_dev(main, t13);
    			append_dev(main, hr);
    			append_dev(main, t14);
    			append_dev(main, img2);
    			append_dev(main, t15);
    			append_dev(main, h2);
    			append_dev(main, t17);
    			append_dev(main, img3);
    			append_dev(main, t18);
    			append_dev(main, img4);
    			append_dev(main, t19);
    			append_dev(main, h3);
    			append_dev(main, t21);
    			append_dev(main, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
