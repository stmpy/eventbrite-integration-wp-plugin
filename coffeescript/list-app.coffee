App = new Marionette.Application
	regions:
		application: '.main-content'


# ##     ##  #######  ########  ######## ##        ######  
# ###   ### ##     ## ##     ## ##       ##       ##    ## 
# #### #### ##     ## ##     ## ##       ##       ##       
# ## ### ## ##     ## ##     ## ######   ##        ######  
# ##     ## ##     ## ##     ## ##       ##             ## 
# ##     ## ##     ## ##     ## ##       ##       ##    ## 
# ##     ##  #######  ########  ######## ########  ######  


Event = Backbone.Model.extend
	initialize: ->
		console.log 'initing a model'
		console.log @attributes
		@set 'local_url', '/' + App.ops.evi_event_detail_page + '/?' + App.ops.evi_event_id_variable + '=' + @get 'ID'
		console.log @get 'local_url'
Events = Backbone.Collection.extend model: Event

Tab = Backbone.Model.extend {}
Tabs = Backbone.Collection.extend model: Tab


# ##     ## #### ######## ##      ##  ######  
# ##     ##  ##  ##       ##  ##  ## ##    ## 
# ##     ##  ##  ##       ##  ##  ## ##       
# ##     ##  ##  ######   ##  ##  ##  ######  
#  ##   ##   ##  ##       ##  ##  ##       ## 
#   ## ##    ##  ##       ##  ##  ## ##    ## 
#    ###    #### ########  ###  ###   ######  


TabView = Marionette.ItemView.extend {}

TabsView = Marionette.CollectionView.extend
	events:
		'click li > a': 'ohHell'
	ohHell: (event) ->
		tab = @collection.findWhere { tab_id: @$(event.currentTarget).attr('href') }
		return if tab.get 'activated'
		tab.set 'activated', true
		App.controller[tab.get 'param']()

	initialize: ->
		self = this
		@$el.find('li > a').each (i,el) ->
			$tab = self.$(el)
			$content = self.$($tab.attr('href')).find('[id^=eventbrite]')
			[eventbrite, action, param] = $content.attr('id').split('-',3)
			tab = new Tab { name: $tab.html(), tab_id: $tab.attr('href'), action: action, param: param, content: $content.attr('id'), activated: false }
			self.collection.add tab
			region = {}
			region[tab.get('param')] = '#' + tab.get('content')
			App.addRegions region

	# childViewOptions: (child) ->


EventView = Marionette.ItemView.extend
	className: 'eventbrite-event'
	template: (model) -> 
		_.template(App.ops.evi_event_template)(model)

ThirdColumnView = Marionette.CollectionView.extend
	className: 'vc_span4 wpb_column column_container col no-extra-padding'
	childView: EventView


# ##          ###    ##    ##  #######  ##     ## ########  ######  
# ##         ## ##    ##  ##  ##     ## ##     ##    ##    ##    ## 
# ##        ##   ##    ####   ##     ## ##     ##    ##    ##       
# ##       ##     ##    ##    ##     ## ##     ##    ##     ######  
# ##       #########    ##    ##     ## ##     ##    ##          ## 
# ##       ##     ##    ##    ##     ## ##     ##    ##    ##    ## 
# ######## ##     ##    ##     #######   #######     ##     ######  

ColumnLayout = Marionette.LayoutView.extend
	className: 'vc_row-fluid'
	regions:
		column1: '#column1'
		column2: '#column2'
		column3: '#column3'
	template: _.template('')

	_mapping:
		'3': ThirdColumnView

	onRender: ->
		self = this
		columnView = @_mapping[@getOption('column_count')]
		_.each @getOption('columns'), (group,i) ->
			self.$el.append (new columnView
				collection: new Events group).render().el

CategoryLayout = Marionette.LayoutView.extend
	template: _.template ''
	onRender: ->
		self = this
		_.each @getOption('categories'), (group,category) ->
			
			self.$el.prepend "<div class='vc_row-fluid'><div class='vc_span12 col'><h4 class='eventbrite-category-title'>" + category + "</h4></div></div>", (new ColumnLayout column_count: 3, columns: _.groupBy group, (event,i) ->
				(parseInt i / (group.length / 3))).render().el

MapLayout = Marionette.LayoutView.extend
	template: _.template '<div id="map-canvas" class="google-map-large vc_span12 col"></div>'
	className: 'eventbrite-list-map row'
	markers: []

	onRender: ->

		self = this
		styles = [
			stylers: [ { hue: "#dfecf1" }, { saturation: 40 } ]
		,
			featureType: "road",
			elementType: "geometry",
			stylers: [ { lightness: 100 }, { visibility: "simplified" } ]
		,
			featureType: "road",
			elementType: "labels",
			stylers: [ { visibility: "off" } ]
		]

		if _.isUndefined(@map)
			styledMap = new google.maps.StyledMapType styles, { name: "color me rad" }
			@map = new google.maps.Map @$('#map-canvas')[0],
				zoom: 4
				center: new google.maps.LatLng(37.09024, -95.712891);
				mapTypeControlOptions:
					mapTypeIds: [ google.maps.MapTypeId.ROADMAP, 'map_style']

			@map.mapTypes.set 'map_style', styledMap
			@map.setMapTypeId 'map_style'

		# google.maps.event.trigger(@map, "resize")

		@_geoLocate()

		@getOption('evnts').each (event) ->
			self.drawMarker new google.maps.LatLng parseFloat(event.get('venue').latitude), parseFloat(event.get('venue').longitude)

	drawMarker: (location) ->

		@markers.push new google.maps.Marker
			map: @map
			position: location
			animation: google.maps.Animation.DROP

	# Method 1 Geolocation API
	_geoLocate: ->
		# Get visitor location
		# https://developer.mozilla.org/en-US/docs/Web/API/Geolocation.getCurrentPosition
		unless _.isUndefined(navigator.geolocation.getCurrentPosition)
			self = this
			navigator.geolocation.getCurrentPosition (position) ->
				self._setMyLocation position.coords.latitude, position.coords.longitude
			, (error) -> self._ipLocate()

	# Method 2 IP lookup
	_ipLocate: ->
		# https://ipinfo.io
		jQuery.ajax "http://ipinfo.io", 
			context: this
			success: (location) ->
				lat_lng = location.loc.split(',')
				@_setMyLocation parseFloat(lat_lng[0]), parseFloat(lat_lng[1])
			dataType: "jsonp"

	_setMyLocation: (lat,lng) ->
		myLocation = new google.maps.LatLng parseFloat(lat), parseFloat(lng)
		@map.setCenter myLocation
		@map.setZoom 8
		# @drawMarker myLocation

#    ###    ########  ########
#   ## ##   ##     ## ##     ##
#  ##   ##  ##     ## ##     ##
# ##     ## ########  ########
# ######### ##        ##
# ##     ## ##        ##
# ##     ## ##        ##


Controller = Marionette.Controller.extend
	upcoming: ->
		grouped_byDate = App.events['byDate'].groupBy (ev,i) -> moment(ev.get('start').local).format("MMMM YYYY")
		App.upcoming.show new CategoryLayout categories: grouped_byDate

	alphabetical: ->
		grouped_byCity = App.events['byDate'].groupBy (ev,i) -> ev.get('venue').address.city.substr(0,1)
		App.alphabetical.show new CategoryLayout categories: grouped_byCity

	nearby: ->
		App.nearby.show new MapLayout evnts: App.events['noSort']

App.addInitializer (options) ->
	
	@ops = options

	# filter out events that do not match the organizer id
	events = _.filter options.events, (ev) ->
		return ev.organizer.id == options.evi_organizer_id

	@events =
		byDate: new Events _.sortBy events, (ev) -> ev.start.local
		byCity: new Events _.sortBy events, (ev) -> -ev.venue.address.city.substr(0,1)
		noSort: new Events events

	@controller = new Controller

	# Add navigation
	new TabsView
		el: '.tabbed'
		collection: new Tabs
