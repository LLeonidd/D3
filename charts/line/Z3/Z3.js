/**
Требования к передаваемым данным: 
[
	{		id:'id',
		name: 'tag_name',
		data: [{date: 'date in taimstamp', val:123},{date:'1581922709884', val:34.1}]
	}, 
	{...}
]

 Где id - идентификатор тега
   name - название тега, отображается в легенде
   data - данные ключ/значение для отризовки линии графика
		  ▒_ - date - дата в формате unix timestamp
		  ▒_ - val  - значение в int/float. 
	   
**/


	
	class lineChar{
		constructor(minX=0, minY=0, maxX=0, maxY=0) {
		this.rootSelect = 'body';
		this.minX = minX;
		this.minY = minY;
		this.maxX = maxX;
		this.maxY = maxY;
		this.correctY = 1; //На сколько вышке значение Y от минимальных и максимальных значений
		this.padding = 40;
		this.w=1600;
		this.h=500;
		this.formatTime = d3.timeFormat("%d.%m | %H:%M");
		this.formatTimeZoom = d3.timeFormat("%H:%M.%S");
		this.positionX = 'Bottom';
		this.tickx=7;
		this.ticky=15;
		this.style = {
			'gridline': 'stroke: lightgrey; stroke-opacity: 0.7; shape-rendering: crispEdges; /*stroke-dasharray:1.5*/; ', 
			'gridpath': 'stroke-width: 0; '
			};
		this.keys = {'x':'date', 'y':'val', 'y1':'limitY1'}; //Ключи для парсинга данных. Ключи соответствуют полям в передаваемом массиве объектов. Y1 граница для объекта типа area.
		this.data = [{}];
		this.formatTimeLegend = "%H:%M %d-%m-%Y";

		
		}	

		///////////////////////////////////////////////////////////
		// Системные функции //////////////////////////////////////
		//1. Функции получения индекса элемента массива по х координате мыши
		
		getIndexOnXCoord(d, x_coord, xScale, keys){ 
			var index = d3.bisect( d.map(function(d){ return d[keys.x]}) ,  Date.parse(xScale.invert(x_coord)) ) - 1 ;
			return ( index <= 0 ) ? 0:index;
		}
		
		//Располагает фокусные указатели на плижайших доступных элементах датасета		
		drowCircleFocus(id, cx, cy, duration = 100){
			d3.select('#circleFocus_'+id)
				.transition().duration(duration)
				.attr('cx', cx)
				.attr('cy', cy)
				.style('stroke', d3.select('#line_'+id).style('stroke'));

		}
		
		
		//////////////////////////////////////////////////////////

		///////////////////////////////////////////////////////////
		// Функции нахождения минимальных и максимальных значений
		//////////////////////////////////////////////////////////
		 
		// функция нахождения минимального значения по X из набора data
		getMin(data, key){return parseFloat(d3.min(data, function(d) { return d[key]; }));}
		getMax(data, key){return parseFloat(d3.max(data, function(d) { return d[key]; }));}
		
								
	    xScale(){
				return d3.scaleTime()
						.domain([minX, maxX])
						.range([this.padding, this.w]);
					}
		yScale(){ 
				return d3.scaleLinear()
							.domain([this.minY-this.correctY, this.maxY+this.correctY])
							.range([this.h-this.padding, 0]);
					}
		xAxis(){
				return  d3.axisBottom()
						.scale(this.xScale())
						.ticks(this.tickx)
						.tickFormat(this.formatTime);
				}
				
		yAxis(){
				return d3.axisLeft()
						.scale(this.yScale())
						.ticks(this.ticky);
				}
				
		
		///////////// Позиционирование осей //////////////////////////////
		posX(pos=this.positionX){
				switch(pos) {
				  case 'Bottom':  return "translate(0," + (this.h - this.padding) + ")"; break;
				  case 'Zero':  return "translate(0," + (this.yScale()(0)) + ")";   break;
				  case 'Top':  return "translate(0," + (0+this.padding) + ")";   break;
				  default: return "translate(0," + (this.yScale()(0)) + ")";   break;
				}
		
		}
		
		
		
		poligon(){
			var svg = d3.select(this.rootSelect)
					.append("svg")
					.attr('id', 'lineChartSvgArea')
					.attr("width", this.w)
					.attr("height", this.h);
					
					
			//Отрисовка осей
			
			
			// Маска
			svg.append("defs").append("svg:clipPath")
					.attr("id", "clip")
					.append("svg:rect")
					.attr("width", this.w )
					.attr("height", this.h )
					.attr("x", 0+this.padding)
					.attr("y", 0);	
				
			var clip = svg
					.append('g')
					.attr('id', 'clipPathRoot')
					.attr("clip-path", "url(#clip)");
			
			

			// Подложка под область рендеринга  графиков
			clip.append('g')
				.classed('chartBackground', true)
				.attr('fill','#fff')
				.append("svg:rect")
					.attr("width", this.w )
					.attr("height", this.h-this.padding )
					.attr("x", 0+this.padding)
					.attr("y", 0);	

			
			// Область сетки 
			clip.append('g')
				.classed('chartGridGroup',true);

			
			//Ось X. В clip - при зуммировании не заходила дальше границ clip
			clip.append("g")
									.attr("class", "axis")
									.style("-ms-user-select", "none").style("-moz-user-select", "none").style("-webkit-user-select", "none").style("user-select", "none") 
									.attr('id', 'axisX')
								   	.attr("transform", this.posX())
									.call(this.xAxis());
			

			//Ось Y
			svg.append("g")
									.attr("class", "axis")
									.style("-ms-user-select", "none").style("-moz-user-select", "none").style("-webkit-user-select", "none").style("user-select", "none") 
									.attr('id', 'axisY')
									.attr("transform", "translate(" + this.padding + ",0)")
									.call(this.yAxis());	
			
		

			
			this.svg = d3.select('#lineChartSvgArea').select('#clipPathRoot');

			
			
			return this.svg;
		}
		
		// Функиця парсинга атрибутов переданных для создания path
		parseAttr(obj,attr){
			try {
				var key, val;
				attr.forEach(function(d,i){
						key = Object.keys(d)[0] //Ключ атрибута;
						val = Object.values(d)[0] //Значение атрибута;
						obj.attr(key, val);
					});
			} catch {
				return obj;
			}

		}
		
		//Отрисовка осей сетки
		grid_init(xgrid=false, ygrid=true, elSelector ='.chartGridGroup'){
			this.xgrid = xgrid;
			this.ygrid = ygrid;
			var grid_svg;
			if (xgrid) {
			 grid_svg = d3.select(elSelector).append("g")			
				.attr("class", "grid")
				.attr("id", "gridX")
				.attr("transform", "translate(0," + (this.h-this.padding) + ")")
				.call(
					 this.xAxis()
					.tickSize(-this.h)
					.tickFormat("")
				);
				// Устанавливаем стили для линий сетки
				grid_svg.selectAll("#gridX line").attr("style", this.style.gridline);
				grid_svg.selectAll("#gridX path").attr("style", this.style.gridpath); 		
			}
			
			if (ygrid){
			 grid_svg = d3.select(elSelector).append("g")			
				.attr("class", "grid")
				.attr("id", "gridY")
				.attr("transform", "translate("+this.padding+",0)")
				.call(
					 this.yAxis()
					.tickSize(-this.w)
					.tickFormat("")
				);
				grid_svg.selectAll("#gridY line").attr("style",this.style.gridline);
				grid_svg.selectAll("#gridY path").attr("style", this.style.gridpath); 		
			}
			
			return grid_svg;
			
		
		}
		
		
		// Обновление сетки по оси Х
		update_gridX(h, w, padding, style, xScale){
			d3.select('#gridX').transition().duration(1000).call(
								d3.axisBottom(xScale)
								.tickSize(-h)
								.tickFormat(""));
							
							// Устанавливаем стили для линий сетки
							d3.selectAll("#gridX line").attr("style", style.gridline);
							d3.selectAll("#gridX path").attr("style", style.gridpath); 
							
							
			
		}
		
		
		// Обновление сетки по оси Y
		update_gridY(h, w, padding, style, yScale){
			d3.select('#gridY').transition().duration(1000).call(
								d3.axisLeft(yScale)
								.tickSize(-w)
								.tickFormat(""));
							
							// Устанавливаем стили для линий сетки
							d3.selectAll("#gridY line").attr("style", style.gridline);
							d3.selectAll("#gridY path").attr("style", style.gridpath); 

		}
		
		
		// Обновление легенды
		update_legend(id, volx, voly, keys, formatTimeLegend, minY=null, maxY=null, avrY=null){
				var keyy = keys.y;
				var keyx = keys.x;
				var formatTime = d3.timeFormat( formatTimeLegend );
				d3.select('#'+keyy+'Item'+id).text(voly.toFixed(2));
				d3.select('#timeItem'+id).text(formatTime(volx).split(' ')[0]);
				d3.select('#dateItem'+id).text(formatTime(volx).split(' ')[1]);
				if (minY){ d3.select('#minItem'+id).text(minY.toFixed(2)); }
				if (maxY){ d3.select('#maxItem'+id).text(maxY.toFixed(2)); }
				if (avrY){ d3.select('#avrItem'+id).text(avrY.toFixed(2)); }

		}
		

		
		// Функция получения значений графиков и вывод в легенду
		toolTipLine(svg, data){
			var h = this.h;
			var w = this.w;
			var padding = this.padding;
			var xScale=this.xScale();
			var yScale=this.yScale();
			var drowCircleFocus = this.drowCircleFocus;
			var getIndexOnXCoord = this.getIndexOnXCoord;
			var keys = this.keys;
			var formatTime = d3.timeFormat( this.formatTimeLegend );
			var update_legend = this.update_legend;
			var formatTimeLegend = this.formatTimeLegend;
			var focus = svg.append('g').attr('class', 'focus');
			var linefocus = focus.append('line') // Задаем фокусную линию
					.attr('x1',w-3)
					.attr('y1',0)
					.attr('x2',w-3)
					.attr('y2',h-padding)
					.attr('class', 'lineFocus')
					.attr('id', 'lineFocusId')
					.style('stroke','#1fc5b9')
					.style('stroke-width','1');
			
			//create Circle Focus
			data.forEach(function(d){
				 focus.append('circle')
				.attr('r','3')
				.attr('id', 'circleFocus_'+d.id)
				.style('fill','none')
				.style('opacity', function(){ return (d3.select('#line_'+d.id).attr('active')=='false') ? 0 : 1; }); //Задаем прозрачность, от атрибута active графика
				
			}); 
			
			
			
			
	

			svg.on('click', function(){
					
					// Переобределяем функцию скалирования если был применент зум
					if(document.getElementById('brushLine').xScale){xScale = document.getElementById('brushLine').xScale};
							
					var x_coord = d3.mouse(this)[0]; //Координата по Х
					//Зона нечувствительности нажатия //////////////////
					if (x_coord <= 0+padding*1){x_coord = 0+padding*1; }
					if (x_coord >= w){x_coord = w; }
					////////////////////////////////////////////////////
					
					d3.select("#lineFocusId")
					.transition().duration(100)
					.attr('x1',x_coord)
					.attr('y1',0)
					.attr('x2',x_coord)
					.attr('y2',h-padding);
					
					//Обновляем значения в легенде
					data.forEach(function(d){
						var selectEl = getIndexOnXCoord( d.data, x_coord, xScale, keys );
						//Обновляем значение в легенде, где аргументы: 1. Id тега, 2. значение по оси Х, 3.значение по оси Y, 4.атрибут ключей (x = date, y = val, 5.форматы даты/времени в лененды)
						try{update_legend(d.id, d.data[selectEl][keys.x], d.data[selectEl][keys.y], keys, formatTimeLegend ); } catch{ return; }
						
						//привязываем circleFocus к координатам
						try{drowCircleFocus(d.id, xScale(d.data[selectEl][keys.x]), yScale(d.data[selectEl][keys.y]));} catch{ return; }
						
						
									
					});
				

				});
				
			
			 d3.select('body').on('keypress', function(){
				 				
				//Press LeftKey
				if(d3.event.keyCode === 37){
						// Переобределяем функцию скалирования если был применент зум
						if(document.getElementById('brushLine').xScale){xScale = document.getElementById('brushLine').xScale};
					
						var x_coord = d3.select('#lineFocusId').attr('x1');
						//Ограничение по движению указателя влево
						if (x_coord <= 0+1*padding){ x_coord = 0+1*padding;} else{ 
						
						d3.select("#lineFocusId")
							.transition().duration(0)
							.attr('x1',x_coord*1-1)
							.attr('y1',0)
							.attr('x2',x_coord*1-1)
							.attr('y2',h-padding);
						}
						
								
						data.forEach(function(d){ 
							var selectEl = getIndexOnXCoord( d.data, x_coord, xScale, keys );
							
														
								//привязываем circleFocus к координатам
								try{ drowCircleFocus(d.id, xScale(d.data[selectEl][keys.x]), yScale(d.data[selectEl][keys.y])); } catch{ return; }

								//Обновляем значение в легенде	
								try{ update_legend(d.id, d.data[selectEl][keys.x], d.data[selectEl][keys.y], keys, formatTimeLegend ); } catch{ return; }
								
	

						});
						
						
				}
				
				//Press RightKey
				if(d3.event.keyCode === 39){
						// Переобределяем функцию скалирования если был применент зум
						if(document.getElementById('brushLine').xScale){xScale = document.getElementById('brushLine').xScale};
						var x_coord = d3.select('#lineFocusId').attr('x1');

						if (x_coord >= w){ x_coord = w;} else{//Ограничение по движению указателя вправо
						
						d3.select("#lineFocusId")
							.transition().duration(0)
							.attr('x1',x_coord*1+1)
							.attr('y1',0)
							.attr('x2',x_coord*1+1)
							.attr('y2',h-padding);
							
						}

							
						data.forEach(function(d){
							var selectEl = getIndexOnXCoord( d.data, x_coord, xScale, keys );
							
								
								//привязываем circleFocus к координатам
								try{ drowCircleFocus(d.id, xScale(d.data[selectEl][keys.x]), yScale(d.data[selectEl][keys.y]));	 } catch{ return; }
								//Обновляем значение в легенде	
								try{ update_legend(d.id, d.data[selectEl][keys.x], d.data[selectEl][keys.y], keys, formatTimeLegend ); } catch{ return; }
								
			
						});
								
				}

			 });
		}
		
		
		
		

			
		//Функция отрисовки графиков
		renderCharts(path, d, xScale, yScale, keys, color, type){
			try { var active = d.active; } catch { var active; }//Определяем вилимость графика	
			switch (type) {
					case 'line':
						var line = d3.line();
					break;
					
					case 'step':
						var line = d3.line().curve(d3.curveStepAfter)
					break;
					
					default:
						var line = d3.line();
					break;
			}

			
			var svg = path.data([d.data])
							.classed('line', true)
							.attr('active', 'true')
							.style('stroke', color)
							.attr('opacity', function(){ return (active == 'false' )? 0:1; })
							.attr('active', function(){ return (active == 'false' )? 'false':'true'; })							
							.attr("d", line
								.x(function(d) { return xScale(d[keys.keyX]); })
								.y(function(d) { return yScale(d[keys.keyY]); })
										);
			
		}
		
		
		
		//Функция обновления графико
		updateCharts(d, xScale, yScale, keys, type){
			
			switch (type) {
					case 'line':
						var line = d3.line();
					break;
					
					case 'step':
						var line = d3.line().curve(d3.curveStepAfter)
					break;
					
					default:
						var line = d3.line();
					break;
			}
			
		
			d3.select('#line_'+d.id)
				.transition()
				.duration(1000)
				 .attr("d", line
					.x(function(d) { return xScale(d.date) })
					.y(function(d) { return yScale(d.val) })
				);
			
			
		}
		
		
		
		
			
		//Функция инициализации графиков
		
		init(data){		
				
				var yScale=this.yScale(); // Определяем фукнции скалирования  по Х
				var xScale=this.xScale();// Определяем фукнции скалирования  по Y
				var w = this.w;
				var h = this.h;
				var padding = this.padding;
				var xAxis=this.xAxis;
				var renderCharts = this.renderCharts;
				var svg = this.svg;
				var parseAttr = this.parseAttr;
				var color = d3.scaleOrdinal( d3.schemeCategory10 );
				var getIndexOnXCoord  = this.getIndexOnXCoord;
				var keys = this.keys;
				var formatTime = this.formatTime;
				var formatTimeLegend = this.formatTimeLegend;
				var formatTimeZoom = this.formatTimeZoom;
				var drowCircleFocus = this.drowCircleFocus;
				var update_legend = this.update_legend;
				var update_gridX = this.update_gridX;
				var update_gridY = this.update_gridY;
				var style = this.style;
				var xgrid = this.xgrid;
				var ygrid = this.xgrid;
				var updateCharts = this.updateCharts;
				var tickx = this.tickx;
				var ticky = this.ticky;
				

				
				var dataUpd = data;
 				// Отрисовываем графики
				data.forEach(function(d,i){
						if(d.data.length == 1){ dataUpd[i].data.push({'date': maxX, 'val': dataUpd[i].data[0].val });  } //Экстрополируем значения, если 1 значение в массиве, то экстраполируем его, на весь график
						if (d.type == undefined){d.type = 'line'} // Устанавливаем дефолтное значение типа графики (линейны, ступенчатый и т.д.)
						var idTag = 'line_'+d.id;
						var keys = (d.keys == undefined) ? {'keyX':'date', 'keyY':'val'} : {'keyX':d.keys.keyX, 'keyY':d.keys.keyY} ;
						var curColor = color(i);
						var path = svg.append("path").attr('id', idTag);// рендерим линию графика
						renderCharts(path, d, xScale, yScale, keys, curColor, d.type);
						parseAttr(path, d.attr); // Применяем переданные атрибуты attr к объекту path
			
				});
				
				data = dataUpd;
				this.data = data;
				
				
			
			//////////////////////////////////////////
			///////////// ZOOM //////////////////////
			////////////////////////////////////////

			
			//Сброс зума
			var resetBrunsh = function(){
				
				xScale.domain([minX, maxX]);
				d3.select('#axisX').transition().duration(1000).call(d3.axisBottom(xScale).ticks(tickx).tickFormat(formatTime));
			  
				
				////////////Обновляем сетку
							if (xgrid){	update_gridX(h, w, padding, style, xScale); }
							//if (ygrid){	update_gridY(h, w, padding, style, yScale); }
				
				
				///// Перерисовываем line  ////////////////
							data.forEach(function(d){
							 //// Рендерим линии грфиков
								  updateCharts(d, xScale, yScale, keys, d.type)
								
							 //// Обновляем расположение фокусных указателей
								  var x_coord = d3.select('#lineFocusId').attr('x1');
								  var selectEl = getIndexOnXCoord( d.data, x_coord, xScale, keys );
								  try{  drowCircleFocus(d.id, xScale(d.data[selectEl][keys.x]), yScale(d.data[selectEl][keys.y]), 1000);  }catch{ return; }
								  //////////////////////////////////////////////////////////////////////////////////////////////////////////
							
							
							 ////  Обновляем значение в легенде ///////////////////////

								  var dataEl1 = getIndexOnXCoord( d.data, (+0 + padding), xScale, keys ); //Позиция первого элемнта "ОТ" в массиве
								  var dataEl2 = getIndexOnXCoord( d.data, (+w), xScale, keys ); //Позиция второго элемнта "ДО" в массиве
								  var arrY = d.data.map(function(d){return d[keys.y]}); // Массива значений
								  
								  var maxVal = d3.max(arrY.slice(dataEl1, dataEl2));
								  var minVal = d3.min(arrY.slice(dataEl1, dataEl2));
								  var avrVal = d3.mean(arrY.slice(dataEl1, dataEl2));
								
							
								  
								  
								  try{ update_legend(d.id, d.data[selectEl][keys.x], d.data[selectEl][keys.y], keys, formatTimeLegend, minVal, maxVal, avrVal );  } catch{ return; }
							
						
							});
							//////////////////////////////////////////////
			}
			
			// Применение зума
			var updBrush = function(){
						var extent = d3.event.selection; // Возвращает x1, x2 координаты зуммирвания
						// Если ничего не выбрано
						if(extent){
	
							
							var xScaleZoom = xScale.domain([ xScale.invert(extent[0]), xScale.invert(extent[1]) ])
							// Записываем в объект текущию функцию скалирования
							this.xScale = xScaleZoom; 
							
							////////////Обновляем сетку
							if (xgrid){	update_gridX(h, w, padding, style, xScaleZoom); }
							//if (ygrid){	update_gridY(h, w, padding, style, yScale); }
							
					
								
							// Обновляем шкалу Х						
							d3.select('#axisX').transition().duration(1000).call(d3.axisBottom(xScaleZoom).tickFormat(formatTimeZoom));
													
							svg.select(".brush").call(brush.move); // This remove the grey brush area as soon as the selection has been done
							
							///// Перерисовываем line  ////////////////
							
							
							
							data.forEach(function(d){
								   //// Рендерим линии грфиков
								  updateCharts(d, xScaleZoom, yScale, keys, d.type)
								
								  //// Обновляем расположение фокусных указателей
								  var x_coord = d3.select('#lineFocusId').attr('x1');
								  var selectEl = getIndexOnXCoord( d.data, x_coord, xScaleZoom, keys );
								  try{drowCircleFocus(d.id, xScaleZoom(d.data[selectEl][keys.x]), yScale(d.data[selectEl][keys.y]), 1000);} catch{}
								  
								  //////////////////////////////////////////////////////////////////////////////////////////////////////////
								  
								  
								  ////  Обновляем значение в легенде ///////////////////////

								  var dataEl1 = getIndexOnXCoord( d.data, (+0 + padding), xScale, keys ); //Позиция первого элемнта "ОТ" в массиве
								  var dataEl2 = getIndexOnXCoord( d.data, (+w), xScale, keys ); //Позиция второго элемнта "ДО" в массиве
								  var arrY = d.data.map(function(d){return d[keys.y]}); // Массива значений
								  
								  var maxVal = d3.max(arrY.slice(dataEl1, dataEl2));
								  var minVal = d3.min(arrY.slice(dataEl1, dataEl2));
								  var avrVal = d3.mean(arrY.slice(dataEl1, dataEl2));
								
										  
								  try{update_legend(d.id, d.data[selectEl][keys.x], d.data[selectEl][keys.y], keys, formatTimeLegend, minVal, maxVal, avrVal ); } catch{}
								  /////////////////////////////////////////////////////////
								  
								  
								  
							});
							//////////////////////////////////////////////
					    }
					}
					
			// If user double click, reinitialize the chart
			svg.on("dblclick",resetBrunsh);
				
			// Событие по выделению области зума
			var brush = d3.brushX()                   
				.extent( [ [0+this.padding, 0], [this.w, this.h-this.padding] ] )  // Область вилимости маски зуммирования
				.on("end", updBrush);

	
			// Создаем маску зума
			svg
			   .append("g")
			   .attr("class", "brush")
			   .attr("id", "brushLine")
			   .call(brush);
					
			/////////////////////////////////////////////////
				
	
			/////////////////////////////////////////////////
			//////////   Инициализация легенды //////////////
			/////////////////////////////////////////////////
			
			this.legend(this.data);


			
			}
			
			
			area(data=data, attr=[{'class':'area'}], keys = {'keyX':this.keys.x, 'keyY':this.keys.y, 'keyY1':this.keys.y1 }, caption={'status': true, 'text': 'Предельная допустимая граница', 'paddingX':10, 'paddingY':-5}){
				var yScale=this.yScale(); // Определяем фукнции скалирования  по Х
				var xScale=this.xScale();
				var attr = Object.entries(attr);
				
				var path = this.svg.append("path") // рендерим линию графика
							.data([data]) 
							.attr("d", d3.area()
										//.defined(function(d) { return d.average >= 320; })
										.x(function(d) { return xScale(d[keys.keyX]); })
										.y0(function(d) { return yScale(d[keys.keyY]); })
										.y1(function(d) { return yScale(d[keys.keyY1]); })
							);
				path = this.parseAttr(path, attr); // Применяем переданные атрибуты attr к объекту path
				
				if (caption.status){
					 var svgCaption = this.svg.append("text")
					.attr("class", "dangerLabel")
					.attr("x", this.padding + caption.paddingX)
					.attr("y", yScale(data[0][keys.keyY]) + caption.paddingY)
					.text(caption.text);
				}
				
				return path;			

			}
		
		
		legend(data){
			
			console.log(data)
			var arrSort = data.map(function(d,i){return i}).sort()
			
			var dataSort=[]
			arrSort.forEach(function(i){
				
			
				dataSort.push(data[i])
			});
			
			console.log(dataSort)
			
			
			
			//Прозрачность текста в легенде
			var opacityLegendLabelOff = '0.2';
			var opacityLegendLabelOn = '1';
			//// Системные функции ///////////////////
			var formatTime = d3.timeFormat( this.formatTimeLegend );
				
			//////////////////////////////////////
			//     Инициируем линеный указать ////
			//////////////////////////////////////
			
			this.toolTipLine(this.svg, data);

			//////////////////////////////////////
			/////// Формируем скелет таблицы /////
			//////////////////////////////////////
			var legendTable = d3.select(this.rootSelect)
					.append('div').attr("class","legend")
					.append('table');
					
				legendTable.append('thead');	
				legendTable.append('tbody');
				//Формируем заголовок таблицы легенды
				legendTable.select('thead')
				.append('tr')
						.selectAll('th')
						.data(['Параметр', 'Значние', 'Время', ' Дата', 'Min-значение', 'Max-значение', ' Среднее значение'])
						.enter()
							.append('th')
							.text(function(d){return d;});
				
				//Формируем тело таблицы легенды
				var tr = legendTable.select('tbody').selectAll('tr')
					.data(data)
					.enter()
					.append('tr')
					.attr('id', function(d){ return "LegendItemRow"+d.id; })
					.style('opacity', function(d){ return (d3.select('#line_'+d.id).attr('active')=='false') ? opacityLegendLabelOff : opacityLegendLabelOn; }); //Задаем прозрачность, от атрибута active графика
				
				//Формируем колонки таблицы
				var td = tr.selectAll("td")
					.data(['nameItem', 'valItem', 'timeItem', 'dateItem', 'minItem', 'maxItem', 'avrItem'])
					.enter()
					.append("td")
					.attr('class', function(d, i){return d ; });
				
			///////////////////////////////////////////////////////
			///////////////////////////////////////////////////////
				
				var nameItems = d3.selectAll('tbody .nameItem');
				var valItems = d3.selectAll('tbody .valItem');
				var timeItems = d3.selectAll('tbody .timeItem');
				var dateItems = d3.selectAll('tbody .dateItem');
				var minItems = d3.selectAll('tbody .minItem');
				var maxItems = d3.selectAll('tbody .maxItem');
				var avrItems = d3.selectAll('tbody .avrItem');
				
				
				//Заполнеям название атрибутов легенды
					
					nameItems
							.data(data)
							.attr('id', function(d){ return "nameItem"+d.id;})
							.html(function(d){ return d.name; })
							.style('color', function(d){return d3.select("#line_"+d.id).style('stroke');})//Назначаем цвет лейбла
							.style('cursor', "pointer")
								.on("click", function(d){
									var tagChar = d3.select("#line_"+d.id); // Объект на графике
									var active = (tagChar.attr('active')=='true')?'false':'true',
										newOpacity = (active=='false') ? '0' : '1',
										newOpacityText = (active=='false')  ? opacityLegendLabelOff : opacityLegendLabelOn;
									tagChar.attr('active', active);
									tagChar.transition().duration(100).attr("opacity", newOpacity);		// Меняем прозразность графика
									d3.select('#circleFocus_'+d.id).style("opacity", newOpacity); //Меняем значение прозрачности фокусного указатяля			
									d3.select(this.parentNode).transition().duration(100).style("opacity", newOpacityText);	// Меняем прозразность лейбла	
								});
				
												
					valItems
							.data(data)
							.attr('id', function(d){ return "valItem"+d.id})
							.text(function(d, i){try{return parseFloat(d.data[d.data.length-1].val).toFixed(2);} catch {return '-';}});	

					timeItems
							.data(data)
							.attr('id', function(d){ return "timeItem"+d.id})
							.text(function(d, i){try{return formatTime(d.data[d.data.length-1].date).split(' ')[0];} catch{return '-'} });	
					
					dateItems
							.data(data)
							.attr('id', function(d){ return "dateItem"+d.id})
							.text(function(d, i){try{return formatTime(d.data[d.data.length-1].date).split(' ')[1];} catch{return '-'} });					

					minItems
							.data(data)
							.attr('id', function(d){ return "minItem"+d.id})
							.text(function(d, i){ try{ return d3.min(d.data.map(function(d){ return d.val})).toFixed(2);} catch {return '-'; } });	
							
							
					maxItems
							.data(data)
							.attr('id', function(d){ return "maxItem"+d.id})
							.text(function(d, i){ try{ return d3.max(d.data.map(function(d){ return d.val})).toFixed(2);} catch{return '-'} });	
							
					avrItems
							.data(data)
							.attr('id', function(d){ return "avrItem"+d.id})
							.text(function(d, i){ try{return d3.mean(d.data.map(function(d){ return d.val})).toFixed(2);} catch{return '-'} });	
					
			
			
			}
			
	
	
}
