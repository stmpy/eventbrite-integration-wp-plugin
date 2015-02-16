EventApp = new Marionette.Application

EventView = Marionette.ItemView.extend
	initialize: (options) ->
		@template = options.template if options.template

### LINKING ###
Link = Backbone.Model.extend
	initialize: (attributes) ->
		@set 'icon', '<i class="' + attributes.icon_name + '"></i>'

LinkList = Backbone.Collection.extend model: Link

EventLinks = Marionette.CollectionView.extend
	className: 'event-buttons'
	childView: EventView
	initialize: (options) ->
		@template = options.template if options.template

	onRender: ->
		@$el.children().each (i, e) ->
			($link = EventApp.$(e).find('a')).attr('onclick',"_gaq.push(['_link', '" + $link.attr('href') + "']); return false;")

	childViewOptions: ->
		template: @template

### TICKETING ###
TicketsView = Marionette.CollectionView.extend
	childView: EventView
	initialize: (options) ->
		@template = options.template if options.template

	childViewOptions: ->
		template: @template

EventApp.showRegForm = ->
	EventApp.$(EventApp.ops.evi_event_private_class).each (i, e) ->
		EventApp.$(e).show()

EventApp.showPublicDetails = ->
	EventApp.$(EventApp.ops.evi_event_public_class).each (i,e) ->
		EventApp.$(e).show()

EventApp.showSoldOutForm = ->
	EventApp.$(EventApp.ops.evi_event_sold_out_class).each (i,e) ->
		EventApp.$(e).show()

EventApp.renderTemplates = (ev) ->
	EventApp.$(EventApp.ops.evi_event_template_class).each (i,e) ->
		EventApp.$(e).html Handlebars.compile(EventApp.$(e).html())(ev.toJSON())

EventApp.displayLinks = (ev) ->
	@event_links.$el.each (i, e) ->
		EventApp.$(e).html (new EventLinks
			collection: new LinkList [
				url: ev.get('url') + '?team_reg_type=individual'
				icon_name: 'icomoon-user'
				text: 'Participate as an individual'
			,
				url: ev.get('url') + '#team-search'
				icon_name: 'icomoon-users'
				text: 'Join a team'
			,
				url: ev.get('url') + '#team-create'
				icon_name: 'icomoon-plus'
				text: 'Create a team'
			,
				url: 'https://www.eventbrite.com/mytickets/'
				icon_name: 'icomoon-cog'
				text: 'Manage your team'
			]
			template: (attributes) ->
				Handlebars.compile(EventApp.$(e).html())(attributes) + '<br />'
		).render().el

### Settings ###
EventDetails = Marionette.ItemView.extend {}

EventApp.displayTickets = (ev) ->
	@event_tickets.$el.each (i, e) ->
		EventApp.$(e).html (new TicketsView
			collection: ev.get('tickets')
			template: (attributes) ->
				Handlebars.compile(EventApp.$(e).html())(attributes) + '<br />'
		).render().el

EventApp.displayWhenWhere = (ev) ->
	@event_when_where.$el.each (i, e) ->
		EventApp.$(e).html (new EventView
			model: ev
			template: (attributes) ->
				Handlebars.compile(EventApp.$(e).html())(attributes)
		).render().el

EventApp.displaySettings = (ev) ->
	@event_settings.$el.each (i, e) ->
		EventApp.$(e).html (new EventDetails
			model: ev
			template: (attributes) ->
				Handlebars.compile(EventApp.$(e).html())(attributes)
		).render().el

EventApp.drawMap = (ev) ->
	location = new google.maps.LatLng(ev.get('venue').latitude, ev.get('venue').longitude)
	@map.$el.each (i, e) ->
		map = new google.maps.Map e,
			zoom: 11
			center: location
			scrollwheel: EventApp.ops.evi_enable_scroll_wheel
			mapTypeControlOptions:
				mapTypeIds: [ google.maps.MapTypeId.ROADMAP, 'map_style']

		unless _.isEmpty(EventApp.ops.evi_map_style)
			styledMap = new google.maps.StyledMapType JSON.parse(EventApp.ops.evi_map_style), { name: EventApp.ops.evi_map_style_name }
			map.mapTypes.set 'map_style', styledMap
			map.setMapTypeId 'map_style'

		settings =
			map: map
			position: location
			animation: google.maps.Animation.DROP

		settings.icon = EventApp.ops.evi_marker_icon if EventApp.ops.evi_marker_icon

		new google.maps.Marker settings

EventApp.addInitializer (options) ->

	@ops = options
	r = {}
	for region in ['event_links', 'event_tickets', 'event_when_where', 'map', 'event_settings']
		r[region] = options['evi_' + region + '_tag_id'] if EventApp.$(options['evi_' + region + '_tag_id']).length > 0
	@addRegions r

	ev = new Event options.event, @ops

	if _.isEmpty(options.event.ID)
		EventApp.$('.subheader').html("").prev().html("")
		if confirm "Unable to Find event, click 'OK' to view all locations,\n click 'CANCEL' to refresh the page."
			window.location.replace '/locations'
		else
			window.location.reload()

		return

	# Set header for event
	EventApp.$('.subheader').html(moment(ev.get('start').local).format('MMMM Do, YYYY')).prev().html(ev.get('metro'))

	@displayWhenWhere(ev) if @event_when_where
	@displaySettings(ev) if @event_settings
	@drawMap(ev) if @map
	@renderTemplates(ev)

	if ev.get('soldout')
		@showSoldOutForm()
	else if ev.get('public')
		@showPublicDetails()
		@displayLinks(ev) if @event_links
		@displayTickets(ev) if @event_tickets
	else
		@showRegForm()

jQuery( document ).on 'load-event', (e, options = {}) ->
	EventApp.$ = jQuery
	EventApp.start(options)
