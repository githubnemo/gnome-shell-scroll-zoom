const Main = imports.ui.main;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const Meta     = imports.gi.Meta;
const Clutter = imports.gi.Clutter;

const PanelMenu = imports.ui.panelMenu;
const St = imports.gi.St;

// Find all windows with the supplied application ID, e.g. 'pidgin.desktop'
function findWindowsByAppIdAndRole(appId, role) {
	let appSystem = Shell.AppSystem.get_default();

	return appSystem.lookup_app(appId).get_windows().filter(function(w) {
		return w.get_role() == role;
	});
}

function focusWindow(metaWindow) {
	metaWindow.activate(global.get_current_time());
}

function matchCurrentFocusApp(appId) {
	let focusApp = Shell.WindowTracker.get_default().focus_app;

	return (focusApp != null && focusApp.get_id() == appId);
}

function WindowZoomExtension() {
	this._init();
}

WindowZoomExtension.prototype = {

	_init: function() {
		global.log("_init");
		this._gc = null;
		this._ev = null;
	},

	_onGlobalKeyBinding: function(d, s, w, e, b) {
		global.log('in _onGlobalKeyBinding', d, s, w, this._gc);

		this._grab();
	},

	_onGcKeyRelease: function() {
		global.log("in _onGcKeyRelease");
		this._release_grab();
	},

	_grab: function() {
        if (!Main.pushModal(this._gc)) {
            // Probably someone else has a pointer grab, try again with keyboard only
            if (!Main.pushModal(this.actor, { options: Meta.ModalOptions.POINTER_ALREADY_GRABBED })) {
                return false;
            }
        }

		//Clutter.grab_keyboard(this._ev);
		Clutter.grab_pointer(this._ev);

		global.stage.set_key_focus(this._ev);
	},

	_release_grab: function() {
		Clutter.ungrab_keyboard(this._ev);
		Clutter.ungrab_pointer(this._ev);

		Main.popModal(this._gc);
	},

	_onGcAllocate: function(actor, box, flags) {
		global.log('_onGcAllocate');
        let primary = Main.layoutManager.primaryMonitor;

        let [minWidth, minHeight, natWidth, natHeight] =
            this._ev.get_preferred_size();

        let childBox = new Clutter.ActorBox();
        childBox.x1 = primary.x + Math.floor((primary.width - natWidth) / 2);
        childBox.x2 = childBox.x1 + natWidth;
        childBox.y1 = primary.y + Math.floor((primary.height - natHeight) / 2);
        childBox.y2 = childBox.y1 + natHeight;
        this._ev.allocate(childBox, flags);
	},

	_onScroll: function(actor, event) {
		let direction = event.get_scroll_direction();
		let [stageX,stageY] = event.get_coords();
		let actor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, stageX, stageY);

		actor = actor.get_parent();

		let [xs,ys] = actor.get_scale();

		if (!(actor instanceof Meta.WindowActor)) {
			global.log(actor,"parent is not a WindowActor");
			return;
		}

		if (direction == Clutter.ScrollDirection.UP) {
			actor.set_scale(xs+0.1, ys+0.1);
		} else if (direction == Clutter.ScrollDirection.DOWN) {
			actor.set_scale(Math.max(xs-0.1, 0.1), Math.max(ys-0.1,0.1));
		}
	},

    _getPreferredWidth: function(actor, forHeight, alloc) {
        let primary = Main.layoutManager.primaryMonitor;

        alloc.min_size = primary.width;
        alloc.natural_size = primary.width;
    },

    _getPreferredHeight: function(actor, forWidth, alloc) {
        let primary = Main.layoutManager.primaryMonitor;

        alloc.min_size = primary.height;
        alloc.natural_size = primary.height;
    },
	/**
	 * Entry point of the extension.
	 */
	enable: function() {
		global.log("ohai :)")

		this._gc = new Shell.GenericContainer({ width:0, height: 0 });
		this._gc.connect('get-preferred-width', Lang.bind(this, this._getPreferredWidth));
		this._gc.connect('get-preferred-height', Lang.bind(this, this._getPreferredHeight));
		this._gc.connect('allocate', Lang.bind(this, this._onGcAllocate));
		Main.uiGroup.add_actor(this._gc);

		this._ev = new St.BoxLayout({ name: 'KeyCatcher',
                                              vertical: false,
                                              reactive: true });

		this._ev.connect('scroll-event', Lang.bind(this, this._onScroll));
		this._ev.connect('key-press-event', function() {
			global.log('gc kpe');

			return Clutter.EVENT_STOP;
		});
		this._ev.connect('key-release-event', Lang.bind(this, this._onGcKeyRelease));

		this._gc.add_actor(this._ev);

		Meta.keybindings_set_custom_handler(
			'switch-to-workspace-right',
			Lang.bind(this, this._onGlobalKeyBinding)
		);

		//Main.wm.addKeybinding('cycle-screenshot-sizes',
							  //getSettings(),
							  //Meta.KeyBindingFlags.PER_WINDOW | Meta.KeyBindingFlags.REVERSES,
							  //Shell.KeyBindingMode.NORMAL,
							  //cycleScreenshotSizes);
	},

	disable: function() {
		if(this._ev != null && this._gc != null)
			this._release_grab();
		if(this._ev != null)
			this._ev.destroy();
		if(this._gc != null)
			this._gc.destroy();
	}
}


function init() {
	return new WindowZoomExtension();
}
