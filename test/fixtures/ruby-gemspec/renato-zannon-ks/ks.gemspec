# frozen_string_literal: true

lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'ks'

Gem::Specification.new do |spec|
  spec.name           = 'ks'
  spec.version        = Ks::VERSION
  spec.authors        = ['Julik Tarkhanov']
  spec.email          = ['me@julik.nl']

  spec.summary        = 'Keyword-initialized Structs'
  spec.description    = 'Keyword-initialized Structs'
  spec.homepage       = 'http://github.com/WeTransfer/ks'

  # Prevent pushing this gem to RubyGems.org.
  # To allow pushes either set the 'allowed_push_host'
  # To allow pushing to a single host or delete
  # this section to allow pushing to any host.
  if spec.respond_to?(:metadata)
    spec.metadata['allowed_push_host'] = 'https://rubygems.org'
  else
    raise 'RubyGems 2.0 or newer is required to protect against ' \
      'public gem pushes.'
  end

  spec.files = `git ls-files -z`.split("\x0").reject do |f|
    f.match(%r{^(test|spec|features)/})
  end
  spec.bindir         = 'exe'
  spec.executables    = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths  = ['lib']

  spec.add_development_dependency 'bundler', '~> 1'
  spec.add_development_dependency 'rake', '~> 12'
  spec.add_development_dependency 'rspec', '~> 3'
  spec.add_development_dependency 'wetransfer_style', '0.6.0'
  spec.add_development_dependency 'yard', '~> 0.9'
end
