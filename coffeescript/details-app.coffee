App = new Marionette.Application

Event = Backbone.Model.extend
	initialize: (attributes) ->
		start = attributes.start
		mStart = moment(start.local)
		mEnd = moment(attributes.end.local)
		start.formatted = mStart.format('dddd, MMMM Mo, YYYY') + ' from ' + mStart.format('h:mm a') + ' to ' + mEnd.format('h:mm a zz')
		@set 'start', start

### LINKING ###
Link = Backbone.Model.extend
	initialize: (attributes) ->
		@set 'icon', '<i class="' + attributes.icon_name + '"></i>'

LinkList = Backbone.Collection.extend model: Link

LinkView = Marionette.ItemView.extend
	template: (attributes) ->
		Handlebars.compile(jQuery(App.links.el).html())(attributes) + '<br />'
	# '<a href="{{url}}"><i class="{{icon}}"></i>{{text}}</a>'

EventLinks = Marionette.CollectionView.extend
	className: 'event-buttons'
	childView: LinkView

NoEvent = Marionette.ItemView.extend
	template: Handlebars.compile '<h3>Unable to Find event please refresh the page or try again.</h3>'

### TICKETING ###
Ticket = Backbone.Model.extend
	initialize: (attributes) ->
		console.log attributes
		if attributes.free
			@set 'price', 'Free'
		else
			@set 'price', attributes.actual_cost.display

		sale_ends = moment(attributes.sales_end)
		two_weeks = moment().add 2, 'weeks'

		if sale_ends.isBefore two_weeks
			@set 'timeleft', 'only ' + two_weeks.diff(sale_ends, 'days') + ' days left at this price'
		else
			@set 'timeleft', 'until ' + sale_ends.format 'MMMM Mo YYYY'

Tickets = Backbone.Collection.extend model: Ticket

TicketView = Marionette.ItemView.extend
	template: (attributes) ->
		Handlebars.compile(jQuery(App.tickets.el).html())(attributes) + '<br />'
	# template: Handlebars.compile '{{name}}: {{#if free}} FREE {{else}} {{ actual_cost.display }} {{/if}}'
TicketsView = Marionette.CollectionView.extend
	childView: TicketView


### When Where ###
WhenWhereView = Marionette.ItemView.extend
	template: (attributes) ->
		console.log attributes
		Handlebars.compile(jQuery(App.when_where.el).html())(attributes)

App.hideRegForm = ->
	jQuery('.main-content form').parent().hide()

App.displayLinks = (ev) ->
	if ev.get('public')
		@links.show new EventLinks
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
		@hideRegForm()

App.displayTickets = (ev) ->
	if @tickets
		@tickets.show new TicketsView
			collection: new Tickets ev.get('tickets')

App.displayWhenWhere = (ev) ->
	if @when_where
		@drawMap(ev)
		@when_where.show new WhenWhereView
			model: ev

App.drawMap = (ev) ->
	location = new google.maps.LatLng(ev.get('venue').latitude, ev.get('venue').longitude)
	map = new google.maps.Map jQuery('#map-canvas')[0],
		zoom: 11
		center: location
		scrollwheel: App.ops.evi_enable_scroll_wheel
		mapTypeControlOptions:
			mapTypeIds: [ google.maps.MapTypeId.ROADMAP, 'map_style']

	unless _.isEmpty(App.ops.evi_map_style)
		styledMap = new google.maps.StyledMapType JSON.parse(App.ops.evi_map_style), { name: "color me rad" }
		map.mapTypes.set 'map_style', styledMap
		map.setMapTypeId 'map_style'

	settings =
		map: map
		position: location
		animation: google.maps.Animation.DROP

	settings.icon = App.ops.evi_marker_icon if App.ops.evi_marker_icon

	new google.maps.Marker settings

App.addInitializer (options) ->
	console.log options.event
	@ops = options
	r = {}
	for region in ['links', 'tickets', 'when_where']
		r[region] = options['evi_event_' + region + '_tag_id'] if jQuery(options['evi_event_' + region + '_tag_id']).length > 0
	@addRegions r

	ev = new Event options.event

	if _.isEmpty(options.event.ID)
		@hideRegForm()
		@links.show new NoEvent
		return

	# Set header for event
	jQuery('.subheader').html(moment(ev.get('start').local).format('MMMM Do, YYYY')).prev().html(ev.get('venue').address.city + ", " +ev.get('venue').address.region)

	@displayLinks(ev)
	@displayTickets(ev)
	@displayWhenWhere(ev)
